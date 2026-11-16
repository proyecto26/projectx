#!/bin/sh
# Creates the asset bucket in the S3-compatible store and applies its rules.
# Runs with the AWS CLI, so it works with any S3 API (RustFS locally, S3 in the cloud).
# Safe to run again: every step is idempotent.
set -eu

: "${S3_BUCKET:?S3_BUCKET is required}"
: "${S3_ENDPOINT:?S3_ENDPOINT is required}"
: "${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID is required}"
: "${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY is required}"
export AWS_DEFAULT_REGION="${S3_REGION:-us-east-1}"

s3() { aws --endpoint-url "$S3_ENDPOINT" "$@"; }

echo "Waiting for $S3_ENDPOINT"
attempt=0
until s3 s3api list-buckets >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "The object store did not answer after 30 attempts" >&2
    exit 1
  fi
  sleep 2
done

if s3 s3api head-bucket --bucket "$S3_BUCKET" >/dev/null 2>&1; then
  echo "Bucket $S3_BUCKET already exists"
else
  s3 s3api create-bucket --bucket "$S3_BUCKET" >/dev/null
  echo "Created bucket $S3_BUCKET"
fi

# Only published assets are public. staging/ and query/ stay private.
s3 s3api put-bucket-policy --bucket "$S3_BUCKET" --policy "$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadPublishedAssets",
      "Effect": "Allow",
      "Principal": { "AWS": ["*"] },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${S3_BUCKET}/assets/*"]
    }
  ]
}
JSON
)"

# Backstop only: the app deletes these objects itself (see the visual search design)
s3 s3api put-bucket-lifecycle-configuration --bucket "$S3_BUCKET" --lifecycle-configuration '{
  "Rules": [
    { "ID": "expire-staging", "Status": "Enabled", "Filter": { "Prefix": "staging/" }, "Expiration": { "Days": 7 } },
    { "ID": "expire-query-images", "Status": "Enabled", "Filter": { "Prefix": "query/" }, "Expiration": { "Days": 1 } }
  ]
}'

echo "Bucket $S3_BUCKET is ready"
