#!/bin/bash

# Deployment script
set -e

echo "Starting deployment..."

# Build Docker images
echo "Building Docker images..."
docker-compose -f backend/infrastructure/docker/docker-compose.yml build

# Run migrations
echo "Running database migrations..."
docker-compose -f backend/infrastructure/docker/docker-compose.yml run --rm backend npm run migrate

# Start services
echo "Starting services..."
docker-compose -f backend/infrastructure/docker/docker-compose.yml up -d

echo "Deployment completed successfully!"

