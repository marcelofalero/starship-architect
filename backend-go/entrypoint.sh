#!/bin/bash
set -e

echo "🌀 Applying D1 Schema..."
wrangler d1 execute sa-db --local --file=schema.sql --yes

echo "✅ D1 Initialized. Starting Developer Server..."
exec wrangler dev --local --port 8787 --ip 0.0.0.0 --log-level debug