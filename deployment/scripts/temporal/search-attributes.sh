#!/bin/sh
set -eu
TEMPORAL_ADDRESS=${TEMPORAL_ADDRESS:-temporal:7233}
echo "Waiting for Temporal server to be ready..."
until temporal operator cluster health --address $TEMPORAL_ADDRESS > /dev/null 2>&1; do
    echo 'Waiting for Temporal server to be ready...'
    sleep 5
done

echo 'Temporal server is ready!'

echo 'Adding custom search attributes...'
temporal operator search-attribute create --namespace default --name OrderId --type Int --address $TEMPORAL_ADDRESS && echo 'Search attribute OrderId added successfully.' || echo 'OrderId already exists or failed to add.'
temporal operator search-attribute create --namespace default --name UserId --type Int --address $TEMPORAL_ADDRESS && echo 'Search attribute UserId added successfully.' || echo 'UserId already exists or failed to add.'
temporal operator search-attribute create --namespace default --name Email --type Text --address $TEMPORAL_ADDRESS && echo 'Search attribute Email added successfully.' || echo 'Email already exists or failed to add.'

echo 'Temporal search attributes setup complete!'