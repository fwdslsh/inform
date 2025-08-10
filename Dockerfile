# Streamlined Docker container using Bun to build a binary from source
# Using Ubuntu instead of Alpine for glibc compatibility with Bun executables
FROM ubuntu:22.04

# Install essential dependencies, including Bun
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    unzip \
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Install Bun runtime
RUN curl -fsSL https://bun.sh/install | bash && \
    mv /root/.bun/bin/bun /usr/local/bin/bun

# Create non-root user
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -m appuser

# Set working directory
WORKDIR /workspace

# Copy source files
COPY src/ ./src/
COPY package.json ./

# Install dependencies using Bun
RUN bun install

# Build the binary using Bun
RUN bun build src/cli.js --compile --outfile /usr/local/bin/inform && \
    chmod +x /usr/local/bin/inform

# Set permissions for the working directory
RUN chown appuser:appgroup /workspace

# Switch to non-root user
USER appuser

# Set default entrypoint and command
ENTRYPOINT ["inform"]
CMD ["--help"]
