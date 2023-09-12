# esdb-arm64-self-hosted-runner

## Overview

 The goal of this project is to set up an self-hosted ARM64 on an Ubuntu ARM64 machine.

 ## Requirements

 1. Node 16
 2. Pulumi

 ## How to run the project to create self-hosted ARM 64 runner

1. Configure Pulumi and AWS on the machine where you run this script if already not configured. Here is documentation to configure Pulumi and AWS :- https://www.pulumi.com/docs/clouds/aws/get-started/begin/

2. Run npm install command to install the required packages for this project. 

```

 npm install
 
```
3. Run the pulumi up command to start the script.

```

 pulumi up

```

 The pulumi up command might run into errors like VPC quota reached. Make sure there is enough room to create a VPC in us-west-2

4. At this point, our AWS instacne is up and running. The next step is to create a self-hosted runner in the GitHub actions (TrainStation repository)

5. Log into the AWS instance that we have created earlier in step 3 and ran the following command:- 

```

cd /home/ubuntu/actions-runner

```

6. Ran the ./config.sh command from the GitHub self-hosted runner that we have created in step 4.

7. Last step is to run the run.sh script in the actions-runner folder through systemd using the following commands:- 

```

sudo systemctl start arm64Runner.service
sudo systemctl status arm64Runner.service
sudo systemctl enable arm64Runner.service

```

**Note** The above arm64Runner.service is already created through pulumi.

The self-hosted runner is up and ready to process the jobs.

## Log File

We have a log file at /var/log/startup.log that captures the script output and errors. If you encounter any errors, please check this file.

