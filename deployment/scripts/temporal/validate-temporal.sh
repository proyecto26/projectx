#!/bin/bash
set -e

TEMPORAL_ADDRESS="${TEMPORAL_ADDRESS:-temporal:7233}"
NAMESPACE="${NAMESPACE:-default}"

echo "=== Temporal Validation Script ==="
echo "Temporal address: $TEMPORAL_ADDRESS"
echo "Namespace: $NAMESPACE"

echo "Waiting for Temporal server to be accessible..."
sleep 15

echo "=== Checking cluster health ==="
temporal operator cluster health --address "$TEMPORAL_ADDRESS"

echo "=== Verifying namespace '$NAMESPACE' ==="
temporal operator namespace describe --namespace "$NAMESPACE" --address "$TEMPORAL_ADDRESS"

echo "=== All validation checks passed! ==="
exit 0
