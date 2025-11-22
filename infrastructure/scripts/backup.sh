#!/bin/bash

# Database backup script
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
MONGO_HOST="localhost"
MONGO_PORT="27017"
MONGO_DB="gidiblog"
MONGO_USER="admin"
MONGO_PASS="password"

mkdir -p $BACKUP_DIR

mongodump --host $MONGO_HOST:$MONGO_PORT \
  --db $MONGO_DB \
  --username $MONGO_USER \
  --password $MONGO_PASS \
  --authenticationDatabase admin \
  --out $BACKUP_DIR/backup_$DATE

tar -czf $BACKUP_DIR/backup_$DATE.tar.gz $BACKUP_DIR/backup_$DATE

rm -rf $BACKUP_DIR/backup_$DATE

echo "Backup completed: backup_$DATE.tar.gz"

