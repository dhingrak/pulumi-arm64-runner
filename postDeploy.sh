#!/bin/bash
set -e  # Exit immediately on any error

# Log file to capture script output and errors
LOG_FILE="/var/log/startup.log"


# Redirect all script output and errors to the log file
exec > >(tee -a "$LOG_FILE") 2>&1

su - ubuntu

# Update the package manager repositories and install other packages

sudo apt-get update -y
sudo apt-get install -y dotnet-sdk-7.0
sudo apt-get install -y dotnet-sdk-6.0

export HOME="/root"

dotnet tool install --global PowerShell

sudo apt-get install -y docker.io



# Create a self-hosted runner 
sudo mkdir /home/ubuntu/actions-runner && cd /home/ubuntu/actions-runner

sudo curl -o actions-runner-linux-arm64-2.309.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.309.0/actions-runner-linux-arm64-2.309.0.tar.gz

sudo tar xzf ./actions-runner-linux-arm64-2.309.0.tar.gz

echo "Runner created successfully"

# After creating the runner we need to run the ./config command that we have in the Github runner on this AWS

# Create a Linux service to run the self hosted runner as a service

sudo chmod -R 777 /home/ubuntu/actions-runner

filename="/etc/systemd/system/arm64Runner.service"
file_content="[Unit]\nDescription= ARM64 runner\n\n[Service]\nEnvironment=\"RUNNER_ALLOW_RUNASROOT=1\"\nEnvironment=\"HOME=/root\"\nExecStart=/home/ubuntu/actions-runner/run.sh\n\n[Install]\nWantedBy=multi-user.target"

sudo bash -c "echo -e \"$file_content\" > \"$filename\""

sudo systemctl daemon-reload

# Check if the file was created successfully
if [ -e "$filename" ]; then
  echo "File created successfully."
else
  echo "Failed to create the file."
fi

exit


