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

COPY backend-rs/Cargo.toml backend-rs/Cargo.lock ./
COPY backend-rs/src/ ./src/
COPY backend-rs/wrangler.toml ./wrangler.toml
COPY backend-rs/schema.sql ./schema.sql
COPY backend-rs/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh

ENV WRANGLER_SEND_METRICS=false
ENV CI=true

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
