#!/bin/sh
set -eu
set -o pipefail

: "${SUPABASE_DB_URL:?SUPABASE_DB_URL must be configured}"

BACKUP_INTERVAL_SECONDS="${BACKUP_INTERVAL_SECONDS:-86400}"
KEEP_DAYS="${KEEP_DAYS:-14}"
LOCAL_BACKUP_DIR="${LOCAL_BACKUP_DIR:-/backups}"
CLOUD_BACKUP_DIR="${CLOUD_BACKUP_DIR:-/cloud-backups}"

mkdir -p "$LOCAL_BACKUP_DIR" "$CLOUD_BACKUP_DIR"

create_backup() {
  timestamp="$(date -u +'%Y%m%d-%H%M%S')"
  filename="supabase-${timestamp}.sql.gz"
  temporary_file="${LOCAL_BACKUP_DIR}/.${filename}.tmp"
  local_file="${LOCAL_BACKUP_DIR}/${filename}"
  cloud_file="${CLOUD_BACKUP_DIR}/${filename}"

  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Starting Supabase backup"
  if ! pg_dump \
      --dbname="$SUPABASE_DB_URL" \
      --no-owner \
      --no-privileges \
      --clean \
      --if-exists \
      | gzip -9 > "$temporary_file"; then
    rm -f "$temporary_file"
    return 1
  fi

  if [ ! -s "$temporary_file" ] || [ "$(wc -c < "$temporary_file")" -lt 1024 ]; then
    echo "Backup file is empty or unexpectedly small" >&2
    rm -f "$temporary_file"
    return 1
  fi
  mv "$temporary_file" "$local_file"
  cp "$local_file" "$cloud_file"

  local_hash="$(sha256sum "$local_file" | awk '{print $1}')"
  cloud_hash="$(sha256sum "$cloud_file" | awk '{print $1}')"
  if [ "$local_hash" != "$cloud_hash" ]; then
    echo "Cloud backup integrity check failed" >&2
    rm -f "$cloud_file"
    return 1
  fi

  find "$LOCAL_BACKUP_DIR" -type f -name 'supabase-*.sql.gz' -mtime "+$KEEP_DAYS" -delete
  find "$CLOUD_BACKUP_DIR" -type f -name 'supabase-*.sql.gz' -mtime "+$KEEP_DAYS" -delete

  echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Backup saved locally and in cloud: $filename"
}

while true; do
  if ! create_backup; then
    echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] Backup failed; retrying at the next interval" >&2
  fi
  sleep "$BACKUP_INTERVAL_SECONDS"
done
