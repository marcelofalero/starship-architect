#!/bin/bash
set -e

# Copy schema if not present (or reference original)
if [ ! -f schema.sql ]; then
    cp ../backend/schema.sql .
fi

echo "Building Go application..."
# Only rebuild if the binary doesn't exist (e.g., volume mount overriding) or if source has changed (optional check, but simple existence is good for now)
if [ ! -f build/app.wasm ]; then
    GOOS=js GOARCH=wasm go build -buildvcs=false -o build/app.wasm .
fi

echo "Initializing D1 database..."
# Check if DB exists locally or just execute?
# wrangler d1 execute swse-db --local --file=schema.sql
# If it fails (already exists), it might be fine, but execute usually is idempotent for schema?
# schema.sql uses CREATE TABLE IF NOT EXISTS. So it's safe.
wrangler d1 execute swse-db --local --file=schema.sql

echo "Starting wrangler dev..."
exec wrangler dev --local --ip 0.0.0.0 --port 8787 --log-level debug
