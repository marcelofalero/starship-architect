FROM golang:1.24-alpine

# Install build dependencies, Node.js, and CA certificates
# git: for go mod download
# ca-certificates: for HTTPS requests
# curl: for healthchecks
# nodejs/npm: for wrangler
# Using a single RUN command to minimize layers and avoid overlayfs issues
RUN apk add --no-cache \
    git \
    ca-certificates \
    curl \
    nodejs \
    npm

RUN npm install -g wrangler

WORKDIR /app

# Copy entrypoint script
COPY backend-go/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8787

# Set working directory to where the Go module lives
WORKDIR /app/backend-go

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
