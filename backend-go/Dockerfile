FROM golang:alpine

# Install Node.js, NPM, CA certificates, and Git
# nodejs/npm: Required for Wrangler
# ca-certificates: Required for HTTPS requests (e.g. Google Auth, JWKS)
# git: Required for 'go get' and module fetching
RUN apk add --no-cache \
    nodejs \
    npm \
    ca-certificates \
    git \
    curl

# Install Wrangler globally
RUN npm install -g wrangler

WORKDIR /app

# Copy entrypoint script
COPY backend-go/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8787

# Set working directory to the module root
WORKDIR /app/backend-go

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
