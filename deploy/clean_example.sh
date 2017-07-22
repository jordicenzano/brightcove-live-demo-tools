#!/usr/bin/env bash

DEST_BUCKET="s3://here-my-bucket-with-website-enabled/my-path"

aws s3 rm ${DEST_BUCKET} --recursive