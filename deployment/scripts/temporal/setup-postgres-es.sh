#!/bin/sh
set -eu

# Validate required environment variables
: "${ES_SCHEME:?ERROR: ES_SCHEME environment variable is required}"
: "${ES_HOST:?ERROR: ES_HOST environment variable is required}"
: "${ES_PORT:?ERROR: ES_PORT environment variable is required}"
: "${ES_VISIBILITY_INDEX:?ERROR: ES_VISIBILITY_INDEX environment variable is required}"
: "${ES_VERSION:?ERROR: ES_VERSION environment variable is required}"

DB_HOST=${POSTGRES_SEEDS:-${DB_HOST:-db}}
DB_PORT=${DB_PORT:-5432}

echo "Starting PostgreSQL and Elasticsearch schema setup..."
echo "Waiting for PostgreSQL ($DB_HOST:$DB_PORT) to be available..."
until nc -z $DB_HOST $DB_PORT; do
  echo "Waiting for DB..."
  sleep 1
done
echo 'PostgreSQL port is available'

# Create and setup temporal database
temporal-sql-tool --plugin postgres12 --ep $DB_HOST -u $POSTGRES_USER -p $DB_PORT --db temporal create || echo "Database temporal already exists"
temporal-sql-tool --plugin postgres12 --ep $DB_HOST -u $POSTGRES_USER -p $DB_PORT --db temporal setup-schema -v 0.0 || echo "Schema already initialized"
temporal-sql-tool --plugin postgres12 --ep $DB_HOST -u $POSTGRES_USER -p $DB_PORT --db temporal update-schema -d /etc/temporal/schema/postgresql/v12/temporal/versioned

# Setup Elasticsearch index
ES_ENDPOINT="$ES_SCHEME://$ES_HOST:$ES_PORT"
echo 'Waiting for Elasticsearch to be ready...'
until nc -z "$ES_HOST" "$ES_PORT"; do
  echo 'Elasticsearch not ready yet, waiting...'
  sleep 2
done
until temporal-elasticsearch-tool --ep "$ES_ENDPOINT" setup-schema; do
  echo 'Elasticsearch setup failed, retrying...'
  sleep 2
done
temporal-elasticsearch-tool --ep "$ES_ENDPOINT" create-index --index "$ES_VISIBILITY_INDEX" || echo "Index $ES_VISIBILITY_INDEX already exists"
# Existing indexes do not pick up new fields from the template, so apply the mappings as well
temporal-elasticsearch-tool --ep "$ES_ENDPOINT" update-schema --index "$ES_VISIBILITY_INDEX"

echo 'PostgreSQL and Elasticsearch setup complete'
