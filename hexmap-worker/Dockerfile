FROM rust:slim-bookworm

# Install Node.js, Wrangler, and requirements
RUN apt-get update && apt-get install -y \
    curl \
    bash \
    build-essential \
    pkg-config \
    libssl-dev \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g wrangler \
    && rm -rf /var/lib/apt/lists/*

# Install worker-build and wasm32 target
RUN cargo install worker-build --locked \
    && rustup target add wasm32-unknown-unknown

WORKDIR /app

COPY hexmap-worker/Cargo.toml hexmap-worker/Cargo.lock ./
COPY hexmap-worker/src/ ./src/
COPY hexmap-worker/wrangler.toml ./wrangler.toml

ENV WRANGLER_SEND_METRICS=false
ENV CI=true

ENTRYPOINT ["wrangler", "dev", "--local", "--port", "8788", "--ip", "0.0.0.0"]
