import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as fs from "fs"


const config = new pulumi.Config();
const instanceType = config.require("instanceType")
const diskSize = config.require("diskSize")
const volumeType = config.require("volumeType")


const awsInstanceTypeMapping = new Map([
    ["t4g", aws.ec2.InstanceType.T4g_Medium],
    ["c6g", aws.ec2.InstanceType.C6g_Large],
    ["m6g", aws.ec2.InstanceType.M6g_Large],
    ["m6gd", aws.ec2.InstanceType.M6gd_Large]
]);


const vpc = new aws.ec2.Vpc("vpc", {
    cidrBlock: "10.0.0.0/16",
});

// Create an an internet gateway.
// const gateway = new aws.ec2.InternetGateway("gateway", {
//     vpcId: vpc.id,
// });


const subnet = new aws.ec2.Subnet("subnet", {
    vpcId: vpc.id,
    cidrBlock: "10.0.1.0/24",
   // mapPublicIpOnLaunch: true,
});

// Create a route table.
const routes = new aws.ec2.RouteTable("routes", {
    vpcId: vpc.id,
    // routes: [
    //     {
    //         cidrBlock: "0.0.0.0/0",
    //         gatewayId: gateway.id,
    //     },
    // ],
});


const routeTableAssociation = new aws.ec2.RouteTableAssociation("route-table-association", {
    subnetId: subnet.id,
    routeTableId: routes.id,
});


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


let userData = fs.readFileSync("postDeploy.sh").toString();
let instanceProfile = createNodeInstanceProfile();


function createNodeInstanceProfile() {
	let role = new aws.iam.Role("EventStoreDB", {
		path: "/",
		managedPolicyArns: [
			'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
			'arn:aws:iam::aws:policy/AmazonS3FullAccess'
		],
		assumeRolePolicy: `{
			"Version": "2012-10-17",
			"Statement": [
				{
					"Action": "sts:AssumeRole",
					"Principal": {
					"Service": "ec2.amazonaws.com"
					},
					"Effect": "Allow",
					"Sid": ""
				}
			]
		}`,
	});
	
	return new aws.iam.InstanceProfile("EventStoreDB", {role: role.name});
}

if (!awsInstanceTypeMapping.has(instanceType)) {
    throw new Error(`Unsupported instance type: ${instanceType}. Currently we only supports t4g, c6g, m6g, m6gd`)
}

if (volumeType != "gp3" && volumeType != "gp2") {
    throw new Error(`Unsupported volume type : ${volumeType}`)
}

if (parseInt(diskSize) < 10 || parseInt(diskSize) > 100 ) {
    throw new Error(`Disk size must be between 10 and 100`)
}

// Create and launch an Amazon Ubuntu EC2 instance
const instance = new aws.ec2.Instance("instance", {
    ami: ami.id,
    instanceType: awsInstanceTypeMapping.get(instanceType),
    iamInstanceProfile: instanceProfile,
    subnetId: subnet.id,
    vpcSecurityGroupIds: [
        securityGroup.id,
    ],
    ebsBlockDevices: [
        {
            deviceName: "/dev/sda1",
            volumeType: volumeType,
            volumeSize: parseInt(diskSize),
        }
    ],
    userData: userData,
    tags: {
        Name: "Linux-ARM64-Runner"
    }
});

// Export the instance's publicly accessible URL.
module.exports = {
    instanceURL: pulumi.interpolate `http://${instance.privateIp}`,
    instanceType: awsInstanceTypeMapping.get(instanceType),
    diskSize: pulumi.interpolate `${diskSize}GB`,
    volumeType: volumeType
};