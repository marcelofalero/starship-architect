FROM node:20-slim

# Install Python and build dependencies needed for bundling and cryptography
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN npm install -g wrangler

# Copy backend requirements for bundling as requirements.txt for wrangler
COPY backend/cf-requirements.txt ./requirements.txt

# Expose default wrangler dev port
EXPOSE 8787

# Set workdir to backend where wrangler.toml lives (when mounted or copied)
# But wait, wrangler dev needs to run from the directory containing wrangler.toml
WORKDIR /app/backend

# Command to run wrangler dev
# Note: This assumes the host volume mounts the repo root to /app
CMD ["wrangler", "dev", "--host", "0.0.0.0"]
