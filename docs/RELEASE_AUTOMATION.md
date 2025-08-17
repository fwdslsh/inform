# Release Automation Setup

This document describes the release automation setup for the Inform project, including binary builds, GitHub releases, and Docker image publishing.

## Overview

The release automation includes:

- **Cross-platform binary builds** for Linux, macOS, and Windows (x86_64 and ARM64)
- **Automated GitHub releases** with release notes and download links
- **Docker image builds** and publishing to Docker Hub
- **Installation script** for easy binary installation
- **Checksum verification** for download integrity

## GitHub Workflows

### Build Binaries (`.github/workflows/build-binaries.yml`)

Builds Bun executables for multiple platforms:
- **Linux**: x86_64, ARM64
- **macOS**: Intel (x86_64), Apple Silicon (ARM64)  
- **Windows**: x86_64

**Features:**
- Matrix build strategy for parallel compilation
- Automated testing before binary creation (when tests available)
- SHA256 checksum generation
- Artifact upload with 30-day retention
- Cross-platform compatibility testing

### Release (`.github/workflows/release.yml`)

Creates GitHub releases with comprehensive automation:
- **Trigger**: Version tags (`v*`) or manual dispatch
- **Pre-release detection**: Automatic based on tag format
- **Release notes**: Auto-generated with installation instructions
- **Asset organization**: All binaries with consolidated checksums
- **Docker publishing**: Multi-platform images to Docker Hub

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings:

### Docker Hub Integration

- **`DOCKERHUB_USERNAME`**: Your Docker Hub username
- **`DOCKERHUB_TOKEN`**: Docker Hub access token with push permissions

### Optional Secrets

- **`NPM_TOKEN`**: NPM token for package publishing (if needed)

## Binary Naming Convention

Binaries follow the format: `{project-name}-{os}-{arch}[.exe]`

**Examples:**
- `inform-linux-x86_64`
- `inform-linux-arm64`
- `inform-darwin-x86_64` (macOS Intel)
- `inform-darwin-arm64` (macOS Apple Silicon)
- `inform-windows-x86_64.exe`

## Installation Methods

### Quick Install Script

```bash
curl -fsSL https://raw.githubusercontent.com/fwdslsh/inform/main/install.sh | sh
```

**Script Features:**
- Auto-detects platform and architecture
- Supports multiple installation directories
- GLIBC compatibility checking on Linux
- PATH configuration assistance
- Force reinstall and dry-run modes

**Script Options:**
```bash
./install.sh --help              # Show all options
./install.sh --user              # Install to ~/.local/bin
./install.sh --version v1.0.0    # Install specific version
./install.sh --dir /opt/bin      # Custom installation directory
./install.sh --force             # Force reinstall
./install.sh --dry-run           # Preview installation
```

**Environment Variables:**
- `INFORM_INSTALL_DIR`: Custom installation directory
- `INFORM_VERSION`: Specific version to install
- `INFORM_FORCE`: Force reinstall (any value)

### Manual Installation

1. Download the appropriate binary from [GitHub Releases](https://github.com/fwdslsh/inform/releases)
2. Make it executable: `chmod +x inform-*`
3. Move to PATH: `sudo mv inform-* /usr/local/bin/inform`
4. Verify: `inform --version`

### Docker Installation

```bash
# Run with Docker
docker run fwdslsh/inform:latest --help

# Crawl a website
docker run -v $(pwd):/workspace fwdslsh/inform:latest https://docs.example.com --output-dir /workspace/content
```

## Release Process

### Automatic Release (Recommended)

1. **Create and push a version tag:**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **GitHub Actions will automatically:**
   - Build binaries for all platforms
   - Run tests on each platform (if available)
   - Generate checksums
   - Create GitHub release with release notes
   - Upload all binaries and checksums
   - Build and push Docker images

### Manual Release

Use GitHub's workflow dispatch feature:

1. Go to **Actions** → **Release** in your GitHub repository
2. Click **Run workflow**
3. Enter the tag name (e.g., `v1.0.0`)
4. Select pre-release option if needed
5. Click **Run workflow**

### Pre-release Detection

The system automatically detects pre-releases based on tag format:
- **Release**: `v1.0.0`, `v2.1.3`
- **Pre-release**: `v1.0.0-beta`, `v2.0.0-rc1`, `v1.0.0-alpha.1`

## Development Workflow

### Local Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Run tests (if available)
bun test

# Build local binary
bun run build

# Build all platform binaries
bun run build:all

# Test Docker build
bun run docker:build
bun run docker:test
```

### Testing Releases

```bash
# Test installation script locally
./install.sh --dry-run

# Test with specific version
./install.sh --version v1.0.0 --dry-run

# Test Docker build
docker build -t inform-test .
docker run --rm inform-test --version
```

## Verification and Security

### Checksum Verification

All releases include a `checksums.txt` file with SHA256 hashes:

```bash
# Download binary and checksums
curl -LO https://github.com/fwdslsh/inform/releases/download/v1.0.0/inform-linux-x86_64
curl -LO https://github.com/fwdslsh/inform/releases/download/v1.0.0/checksums.txt

# Verify checksum (Linux/macOS)
shasum -a 256 -c checksums.txt

# Verify checksum (manual)
echo "expected_hash  inform-linux-x86_64" | shasum -a 256 -c
```

### Security Features

- **Non-root Docker containers**: All containers run as unprivileged users
- **Path traversal protection**: Installation script validates all paths
- **GLIBC compatibility**: Automatic compatibility checking on Linux
- **Signature verification**: Checksums for all downloadable assets

## Troubleshooting

### Common Issues

**GLIBC compatibility errors on Linux:**
- The binaries require GLIBC 2.27 or newer
- Install script will warn about compatibility
- Consider building from source on older systems

**Permission denied during installation:**
- Use `--user` flag for user installation
- Or run with `sudo` for system-wide installation
- Check that installation directory is writable

**PATH not updated:**
- Installation script provides shell-specific instructions
- Restart your shell or source your profile
- Manually add installation directory to PATH

**Docker permission errors:**
- Ensure Docker daemon is running
- Check Docker Hub credentials in GitHub secrets
- Verify repository permissions for package publishing

### Getting Help

- **Issues**: [GitHub Issues](https://github.com/fwdslsh/inform/issues)
- **Discussions**: [GitHub Discussions](https://github.com/fwdslsh/inform/discussions)
- **Documentation**: [Main README](README.md)

## Configuration Reference

### Workflow Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PROJECT_NAME` | CLI tool name | `inform` |
| `REPO_OWNER` | GitHub username/org | `fwdslsh` |
| `REPO_NAME` | GitHub repository | `inform` |
| `DOCKERHUB_USER` | Docker Hub username | `fwdslsh` |
| `CLI_ENTRYPOINT` | Main CLI file | `src/cli.js` |

### Build Targets

| Platform | Target | Architecture | Binary Name |
|----------|--------|--------------|-------------|
| Linux | `linux-x64` | x86_64 | `inform-linux-x86_64` |
| Linux | `linux-arm64` | ARM64 | `inform-linux-arm64` |
| macOS | `darwin-x64` | Intel | `inform-darwin-x86_64` |
| macOS | `darwin-arm64` | Apple Silicon | `inform-darwin-arm64` |
| Windows | `windows-x64` | x86_64 | `inform-windows-x86_64.exe` |

## Integration with Catalog

Inform works seamlessly with [Catalog](https://github.com/fwdslsh/catalog) for complete documentation workflows:

```bash
# Step 1: Crawl with Inform
inform https://docs.example.com --output-dir docs

# Step 2: Generate LLMS artifacts with Catalog
catalog --input docs --output build --generate-index
```

This setup provides a complete, production-ready release automation system for the Inform CLI tool.
