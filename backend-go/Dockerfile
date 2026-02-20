# Stage 1: Build Go WASM
FROM golang:1.24-bookworm AS builder

WORKDIR /src
# Copy Go module files from the backend-go folder
COPY backend-go/go.mod backend-go/go.sum* ./
RUN go mod download

# Copy the source and build the WASM binary
COPY backend-go/ .
RUN GOOS=js GOARCH=wasm go build -o /tmp/app.wasm .

# ---
# Stage 2: Stable Runtime (Node 20 LTS + Debian for glibc)
FROM node:20-bookworm-slim

# Install Wrangler and basic utilities (Removing su-exec)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    bash \
    curl \
    && npm install -g wrangler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend-go

# Copy the WASM binary from the builder
COPY --from=builder /tmp/app.wasm /usr/local/bin/app.wasm

# Copy the entrypoint and schema
COPY backend-go/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY backend-go/schema.sql ./schema.sql
RUN chmod +x /usr/local/bin/entrypoint.sh

# Environment flags to prevent Wrangler "phone home" hangs
ENV WRANGLER_SEND_METRICS=false
ENV CI=true
ENV NODE_OPTIONS="--max-old-space-size=2048 --no-warnings"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]