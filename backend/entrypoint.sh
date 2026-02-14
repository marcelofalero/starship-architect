#!/bin/bash
set -e

# Ensure requirements.txt exists for wrangler
cp cf-requirements.txt requirements.txt

# Initialize DB if needed (best effort)
# We use --local to target the local D1 emulation
echo "Applying database schema..."
npx wrangler d1 execute swse-db --local --file=schema.sql || true

# Start the dev server
# Note: Newer Wrangler versions use --ip instead of --host
echo "Starting Wrangler Dev..."
exec npx wrangler dev --ip 0.0.0.0 --port 8787
