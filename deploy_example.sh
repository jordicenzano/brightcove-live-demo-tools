#!/usr/bin/env bash

DEST_BUCKET="s3://here-my-bucket-with-website-enabled/my-path"

aws s3 sync . ${DEST_BUCKET} --exclude ".*" --exclude "*.sh"

#Set what env will point the code, can be: qa, st, pr
echo '{"env": {"name": "XX", "value":"xx" }}' > env_tmp.json
aws s3 cp env_tmp.json ${DEST_BUCKET}/env.json
rm env_tmp.json