import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";
import * as fs from "fs"


const pulumiConfig = new pulumi.Config();

// Create a VPC.
const vpc = new aws.ec2.Vpc("vpc", {
    cidrBlock: "10.0.0.0/16",
});

// Create an an internet gateway.
const gateway = new aws.ec2.InternetGateway("gateway", {
    vpcId: vpc.id,
});

// Create a subnet that automatically assigns new instances a public IP address.
const subnet = new aws.ec2.Subnet("subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
    mapPublicIpOnLaunch: true,
});

// Create a route table.
const routes = new aws.ec2.RouteTable("routes", {
    vpcId: vpc.id,
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: gateway.id,
        },
    ],
});

// Associate the route table with the public subnet.
const routeTableAssociation = new aws.ec2.RouteTableAssociation("route-table-association", {
    subnetId: subnet.id,
    routeTableId: routes.id,
});

// Create a security group allowing inbound access over port 22 and outbound
// access to anywhere.
const securityGroup = new aws.ec2.SecurityGroup("security-group", {
    vpcId: vpc.id,
    ingress: [
        {
            cidrBlocks: [ "0.0.0.0/0" ],
            protocol: "tcp",
            fromPort: 22,
            toPort: 22,
        },
    ],
    egress: [
        {
            cidrBlocks: [ "0.0.0.0/0" ],
            fromPort: 0,
            toPort: 0,
            protocol: "-1",
        },
    ],
});

// Find the latest Ubuntu ARM64 AMI.
const ami = pulumi.output(aws.ec2.getAmi({
    owners: ["amazon"],
    mostRecent: true,
    filters: [
        { name: "name", values: [ "ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-arm64-server-*" ] },
    ],
}));


let keyPair = getOrGenerateKeyPair("cluster");
let keyName = keyPair[0];
let userData = fs.readFileSync("postDeploy.sh").toString();

function generatePrivateKey(name:string) : tls.PrivateKey{
	let args : tls.PrivateKeyArgs = {
		algorithm: "RSA",
		rsaBits: 2048
	}
	return new tls.PrivateKey(`EventStoreDB-${name}-private-key`, args);
}

function generateKeyPair(name:string) : [pulumi.Output<string>, pulumi.Output<string>]{
	let privateKey = generatePrivateKey(name);
	let args : aws.ec2.KeyPairArgs = {
		publicKey: privateKey.publicKeyOpenssh
	};
	let keyPair = new aws.ec2.KeyPair(`EventStoreDB-${name}-key-pair`, args);
	return [keyPair.keyName, privateKey.privateKeyPem];
}

function getOrGenerateKeyPair(name:string) : [pulumi.Output<string>, pulumi.Output<string>]{
	let keyName : pulumi.Output<string>;
	let privateKeyPem : pulumi.Output<string>;

	if(!pulumiConfig.get("keyName")){
		let keyPair = generateKeyPair(name);
		keyName = keyPair[0];
		privateKeyPem = keyPair[1];
	} else{
		keyName = pulumi.output(pulumiConfig.require("keyName"));
		privateKeyPem = pulumiConfig.requireSecret("privateKey");
	}
	return [keyName, privateKeyPem];
}

// Create and launch an Amazon Ubuntu EC2 instance into the public subnet.
const instance = new aws.ec2.Instance("instance", {
    ami: ami.id,
    instanceType: "t4g.medium",
    subnetId: subnet.id,
    vpcSecurityGroupIds: [
        securityGroup.id,
    ],
    ebsBlockDevices: [
        {
            deviceName: "/dev/sda1",
            volumeType: "gp2",
            volumeSize: 30,
        }
    ],
    keyName: keyName,
    userData: userData
});

// Export the instance's publicly accessible URL.
module.exports = {
    instanceURL: pulumi.interpolate `http://${instance.publicIp}`,
};