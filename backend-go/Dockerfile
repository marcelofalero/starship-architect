# Stage 1: Build Go WASM
FROM golang:1.24-bookworm AS builder

WORKDIR /src
# Copy Go module files from the backend-go folder
COPY backend-go/go.mod backend-go/go.sum* ./
RUN go mod download

# Copy the source and build the WASM binary
COPY backend-go/ .
RUN GOOS=js GOARCH=wasm go build -o build/app.wasm .

# ---
# Stage 2: Debug (Native with Delve)
FROM golang:1.24-bookworm AS debug

# Install Delve
RUN go install github.com/go-delve/delve/cmd/dlv@latest

WORKDIR /app
COPY backend-go/go.mod backend-go/go.sum* ./
RUN go mod download

# We don't need to copy source code here because it will be mounted from the host.
# However, copying it is good practice for initial setup or if volume mount fails.
COPY backend-go/ .

# Expose ports: 8787 for app, 40000 for debugger
EXPOSE 8787 40000

# Run with Delve
# --headless: run without terminal
# --listen: listen address for debugger client
# --api-version: API version
# --accept-multiclient: allow multiple clients
# "debug" compiles and runs the main package in the current directory
CMD ["dlv", "debug", "--headless", "--listen=:40000", "--api-version=2", "--accept-multiclient", "."]

# ---
# Stage 3: Stable Runtime (Node 20 LTS + Debian for glibc)
FROM node:20-bookworm-slim

# Install Wrangler and basic utilities (Removing su-exec)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    bash \
    curl \
    && npm install -g wrangler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the WASM binary from the builder
COPY --from=builder /src/build/ ./build/

# Copy the entrypoint and schema
COPY backend-go/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY backend-go/schema.sql ./schema.sql
COPY backend-go/wrangler.toml ./wrangler.toml
RUN chmod +x /usr/local/bin/entrypoint.sh

# Environment flags to prevent Wrangler "phone home" hangs
ENV WRANGLER_SEND_METRICS=false
ENV CI=true
ENV NODE_OPTIONS="--max-old-space-size=2048 --no-warnings"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
