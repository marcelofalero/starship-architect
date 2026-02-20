FROM golang:1.24-alpine

# Install build dependencies, Node.js, and CA certificates
# git: for go mod download
# ca-certificates: for HTTPS requests
# curl: for healthchecks
# nodejs/npm: for wrangler
# bash: for entrypoint script (Alpine uses ash by default)
RUN apk add --no-cache \
    git \
    ca-certificates \
    curl \
    nodejs \
    npm \
    bash

# Install Wrangler globally
RUN npm install -g wrangler

WORKDIR /app

# Copy entrypoint script
# Use a destination path that won't be masked by volumes
COPY backend-go/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8787

# Set working directory to where the Go module lives
WORKDIR /app/backend-go

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
