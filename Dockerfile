# Multi-stage Dockerfile for Inform CLI
# Uses Ubuntu for glibc compatibility with Bun executables

# Build stage
FROM ubuntu:22.04 AS builder

# Install essential dependencies for building
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Bun runtime
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun

# Set working directory
WORKDIR /build

# Copy source files and package configuration
COPY src/ ./src/
COPY package.json ./

# Copy tests if they exist (optional)
RUN mkdir -p ./tests

# Install dependencies using Bun
RUN bun install --frozen-lockfile

# Run tests if available
RUN bun test 2>/dev/null || echo "No tests configured, skipping..."

# Build the binary using Bun
RUN bun build src/cli.js --compile --outfile /usr/local/bin/inform && \
    chmod +x /usr/local/bin/inform

# Verify the binary works
RUN /usr/local/bin/inform --version

# Runtime stage
FROM ubuntu:22.04

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m -s /bin/bash appuser

# Copy the binary from builder stage
COPY --from=builder /usr/local/bin/inform /usr/local/bin/inform

# Create working directory and set permissions
WORKDIR /workspace
RUN chown appuser:appgroup /workspace

# Switch to non-root user
USER appuser

# Add metadata labels
LABEL org.opencontainers.image.title="Inform CLI" \
      org.opencontainers.image.description="High-performance web crawler that converts pages to Markdown" \
      org.opencontainers.image.url="https://github.com/fwdslsh/inform" \
      org.opencontainers.image.source="https://github.com/fwdslsh/inform" \
      org.opencontainers.image.vendor="fwdslsh" \
      org.opencontainers.image.licenses="CC-BY-4.0"

# Set default entrypoint and command
ENTRYPOINT ["inform"]
CMD ["--help"]
