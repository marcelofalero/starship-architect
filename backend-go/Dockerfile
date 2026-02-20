FROM golang:1.24-alpine

# Install build dependencies, Node.js, and CA certificates
RUN apk add --no-cache \
    git \
    ca-certificates \
    curl \
    nodejs \
    npm \
    bash \
    shadow

# Install Wrangler globally
RUN npm install -g wrangler

# Create a non-root user (appuser) with UID/GID 1000
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -m -s /bin/bash appuser

# Set up the app directory and permissions
WORKDIR /app
RUN chown -R appuser:appuser /app

# Ensure entrypoint is executable and owned by the user
COPY backend-go/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh && \
    chown appuser:appuser /usr/local/bin/entrypoint.sh

# Create the backend-go directory to ensure permissions are correct when mounting
RUN mkdir -p /app/backend-go && chown -R appuser:appuser /app/backend-go

# Copy source and build the application inside the image
# This binary will be used unless overridden by a volume mount
USER appuser
WORKDIR /app/backend-go
COPY --chown=appuser:appuser backend-go/ .
RUN GOOS=js GOARCH=wasm go build -buildvcs=false -o build/app.wasm .

EXPOSE 8787

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
