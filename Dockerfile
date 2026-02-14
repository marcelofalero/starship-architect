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

# Copy entrypoint script to a location not masked by volume mount
COPY backend/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose default wrangler dev port
EXPOSE 8787

# Set workdir to backend where wrangler.toml lives (when mounted or copied)
WORKDIR /app/backend

# Command to run via entrypoint
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
