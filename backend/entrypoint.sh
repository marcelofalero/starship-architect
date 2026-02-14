#!/bin/bash
set -e

# Ensure requirements.txt exists for wrangler
cp cf-requirements.txt requirements.txt

# Initialize DB if needed (best effort)
# We use --local to target the local D1 emulation
# This command is idempotent in the sense that it applies schema
echo "Applying database schema..."
npx wrangler d1 execute swse-db --local --file=schema.sql || true

# Start the dev server
echo "Starting Wrangler Dev..."
exec npx wrangler dev --host 0.0.0.0
