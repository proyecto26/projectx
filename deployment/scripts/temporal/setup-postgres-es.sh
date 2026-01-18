#!/bin/sh
set -eu

# Validate required environment variables
: "${ES_SCHEME:?ERROR: ES_SCHEME environment variable is required}"
: "${ES_HOST:?ERROR: ES_HOST environment variable is required}"
: "${ES_PORT:?ERROR: ES_PORT environment variable is required}"
: "${ES_VISIBILITY_INDEX:?ERROR: ES_VISIBILITY_INDEX environment variable is required}"
: "${ES_VERSION:?ERROR: ES_VERSION environment variable is required}"

DB_HOST=${DB_HOST:-db}
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
if [ -x /usr/local/bin/temporal-elasticsearch-tool ]; then
  echo 'Using temporal-elasticsearch-tool for Elasticsearch setup'
  temporal-elasticsearch-tool --ep "$ES_SCHEME://$ES_HOST:$ES_PORT" setup-schema
  temporal-elasticsearch-tool --ep "$ES_SCHEME://$ES_HOST:$ES_PORT" create-index --index $ES_VISIBILITY_INDEX
else
  echo 'Using curl for Elasticsearch setup'
  echo 'Waiting for Elasticsearch to be ready...'
  max_attempts=30
  attempt=0
  until curl -s -f "$ES_SCHEME://$ES_HOST:$ES_PORT/_cluster/health?wait_for_status=yellow&timeout=1s"; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
      echo "ERROR: Elasticsearch did not become ready after $max_attempts attempts"
      exit 1
    fi
    echo "Elasticsearch not ready yet, waiting... (attempt $attempt/$max_attempts)"
    sleep 2
  done
  echo 'Elasticsearch is ready'
  echo 'Creating index template...'
  curl -X PUT --fail "$ES_SCHEME://$ES_HOST:$ES_PORT/_template/temporal_visibility_v1_template" -H 'Content-Type: application/json' --data-binary "@/etc/temporal/schema/elasticsearch/visibility/index_template_$ES_VERSION.json"
  echo 'Creating index...'
  curl --head --fail "$ES_SCHEME://$ES_HOST:$ES_PORT/$ES_VISIBILITY_INDEX" 2>/dev/null || curl -X PUT --fail "$ES_SCHEME://$ES_HOST:$ES_PORT/$ES_VISIBILITY_INDEX"
fi

echo 'PostgreSQL and Elasticsearch setup complete'
