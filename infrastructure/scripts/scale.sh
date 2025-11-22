#!/bin/bash

# Auto-scaling script
SERVICE=$1
REPLICAS=$2

if [ -z "$SERVICE" ] || [ -z "$REPLICAS" ]; then
  echo "Usage: ./scale.sh <service> <replicas>"
  exit 1
fi

docker-compose -f backend/infrastructure/docker/docker-compose.yml scale $SERVICE=$REPLICAS

echo "Scaled $SERVICE to $REPLICAS replicas"

