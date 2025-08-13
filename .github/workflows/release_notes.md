## Usage

```bash
# Crawl a website and convert to Markdown
inform https://docs.example.com

# Crawl with custom settings
inform https://docs.example.com --max-pages 50 --delay 500 --concurrency 5

# Download from Git repository
inform https://github.com/owner/repo

# Download specific directory from Git repository
inform https://github.com/owner/repo/tree/main/docs

# Output raw HTML without Markdown conversion
inform https://docs.example.com --raw --output-dir ./raw-content

# Filter files with glob patterns
inform https://github.com/owner/repo --include "*.md" --exclude "node_modules/**"
```

## Features

- **🚀 Powered by Bun**: Significantly faster than Node.js with built-in optimizations
- **⚡ Concurrent Crawling**: Process multiple pages simultaneously for better performance
- **HTML to Markdown Conversion**: Clean conversion with proper code block handling
- **Git Repository Downloads**: Download files directly from GitHub without cloning
- **Folder Structure Preservation**: Maintains original site structure in output
- **Smart Content Extraction**: Removes navigation, ads, and non-content elements
- **Rate Limiting**: Configurable delays to respect server resources
- **Cross-Platform Binaries**: Available for Linux, macOS, and Windows

## Installation

### Quick Install Script
```bash
curl -fsSL https://raw.githubusercontent.com/fwdslsh/inform/main/install.sh | sh
```

### Manual Downloads
Download pre-built binaries from [GitHub Releases](https://github.com/fwdslsh/inform/releases).

### Docker
```bash
docker run fwdslsh/inform:latest --help
```

### NPM (with Bun)
```bash
bun add @fwdslsh/inform
# or globally
bun install -g @fwdslsh/inform
```

## Documentation

For full documentation, visit the [project repository](https://github.com/fwdslsh/inform).
