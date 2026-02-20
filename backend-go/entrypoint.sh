#!/bin/bash
set -e

# Copy schema if not present (or reference original)
if [ ! -f schema.sql ]; then
    cp ../backend/schema.sql .
fi

echo "Building Go application..."
GOOS=js GOARCH=wasm go build -o build/app.wasm .

echo "Initializing D1 database..."
# Check if DB exists locally or just execute?
# wrangler d1 execute swse-db --local --file=schema.sql
# If it fails (already exists), it might be fine, but execute usually is idempotent for schema?
# schema.sql uses CREATE TABLE IF NOT EXISTS. So it's safe.
wrangler d1 execute swse-db --local --file=schema.sql

echo "Starting wrangler dev..."
exec wrangler dev --local --ip 0.0.0.0 --port 8787
