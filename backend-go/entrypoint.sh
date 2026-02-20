#!/bin/bash
set -e

# Fix permissions of the mounted volume .wrangler directory
if [ -d ".wrangler" ]; then
    chown -R appuser:appuser .wrangler
else
    mkdir -p .wrangler
    chown -R appuser:appuser .wrangler
fi

# Also fix the build directory if it exists
if [ -d "build" ]; then
    chown -R appuser:appuser build
else
    mkdir -p build
    chown -R appuser:appuser build
fi

# Ensure schema.sql is accessible
if [ -f "schema.sql" ]; then
    chown appuser:appuser schema.sql
fi

# Copy schema if not present (or reference original)
if [ ! -f schema.sql ]; then
    cp ../backend/schema.sql .
    chown appuser:appuser schema.sql
fi

echo "Building Go application..."
# Run build as appuser
if [ ! -f build/app.wasm ]; then
    su-exec appuser env GOOS=js GOARCH=wasm go build -buildvcs=false -o build/app.wasm .
fi

echo "Initializing D1 database..."
# Run d1 commands as appuser
su-exec appuser wrangler d1 execute swse-db --local --file=schema.sql

echo "Starting wrangler dev..."
exec su-exec appuser wrangler dev --local --ip 0.0.0.0 --port 8787 --log-level debug
