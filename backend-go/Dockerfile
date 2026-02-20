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
# (Usually matches the first user on most Linux distros)
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
# (though docker volume mount overrides permissions usually, creating it first helps)
RUN mkdir -p /app/backend-go && chown -R appuser:appuser /app/backend-go

EXPOSE 8787

# Switch to non-root user
USER appuser

# Set working directory
WORKDIR /app/backend-go

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
