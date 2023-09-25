# arm64-self-hosted-runner

## Overview

 The goal of this project is to set up a self-hosted GitHub Action runner on an AWS Ubuntu ARM64 machine.

 ## Requirements

 1. Node 16
 2. Pulumi

 ## How to run the project

1. Configure Pulumi and AWS on the machine where you run this script if already not configured. Here is documentation to configure Pulumi and AWS :- https://www.pulumi.com/docs/clouds/aws/get-started/begin/

2. Run npm install command to install the required packages for this project. 

```

 npm install
 
```

3. Create a new pulumi stack and run the pulumi up command to start the script.

```

pulumi stack init

pulumi up

```

You can configure the AWS region which is closer to your location with the help of following command:- 

```

pulumi config set aws:region {AWS region}


```

 The pulumi up command might run into errors like VPC quota reached. Make sure there is enough room to create a VPC in your configured AWS region.

4. At this point, our AWS instance is up and running. The next step is to create a self-hosted runner in GitHub actions. 
Github Repository => Actions => Runners => New Runner => New self-hosted runner.

While creating the runner make sure the runner image is Linux and the architecture is ARM64. 

**Note** The "Download" section mentioned in the newly created GitHub runner is already completed by the pulumi script in step 3. So there is no need to perform any steps provided in GitHub runner Download section.

5. Log into the AWS instance which we created earlier in step 3, change directory to /home/ubuntu/actions-runner. Run the ./config.sh script as mentioned in GitHub runner under "Configure" section. For example:-

```

./config.sh --url {repository path} --token {token value}


```

After running the above script, the terminal asked for the runner group to add this runner to. Press Enter to skip the runner group, by default the runner added to the Default group. You can create a runner group by following
the steps provided in GitHub docs:- 
https://docs.github.com/en/actions/hosting-your-own-runners/managing-self-hosted-runners/managing-access-to-self-hosted-runners-using-groups


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

