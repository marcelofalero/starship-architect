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

# Copy requirements so wrangler can bundle them
COPY requirements.txt .

# Expose default wrangler dev port
EXPOSE 8787

# Command to run wrangler dev
CMD ["wrangler", "dev", "--host", "0.0.0.0"]
