#! /bin/bash
set -e

export AWS_SDK_LOAD_CONFIG=1

# Upload Component files to S3
if [[ $1 = "demo-shared" ]]; then
    aws s3 cp ./components/ s3://kheriox-demo-shared-youtube/image-builder/components/ --recursive
fi

# Deploy the resources
printf "Deploying stacks to $1...\n"
ENV=$1 cdk deploy --all --require-approval never --progress events