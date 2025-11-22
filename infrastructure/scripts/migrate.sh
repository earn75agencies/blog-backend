#!/bin/bash

# Database migration script
cd backend

echo "Running database migrations..."

node scripts/migrate.js

echo "Migrations completed"

