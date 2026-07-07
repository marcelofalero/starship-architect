#!/bin/bash
set -e

echo "🌀 Applying D1 Schema..."
wrangler d1 execute sa-db --local --file=schema.sql --yes || echo "⚠️  Schema might already be applied or failed."

echo "✅ D1 Initialized. Starting Developer Server for Rust Backend..."
# Use wrangler dev, it will automatically call cargo to build the rust worker!
exec wrangler dev --local --port 8787 --ip 0.0.0.0 --log-level debug
