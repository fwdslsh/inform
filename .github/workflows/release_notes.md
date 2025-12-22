# Release Notes

## [0.2.0] - 2025-12-22

### Major New Features

#### 🚀 Feed Ingestion Support
Inform now supports ingesting content from various feed sources using the new `--feed` flag:

- **RSS/Atom Feeds**: Auto-detection from URL patterns (`.xml`, `/rss`, `/feed`)
- **YouTube Channels & Playlists**: Ingests video metadata with optional transcript extraction
- **Bluesky Profiles**: Fetches posts via public ATProto API 
- **X/Twitter Profiles**: Supports API v2 and RSS fallback methods

#### ⚙️ YAML Configuration Files
New configuration system supports complex crawling setups:
- `--config` flag to load YAML configuration files
- Hierarchical settings: defaults < config.globals < target < CLI overrides
- Environment variable resolution with `${VARIABLE}` syntax
- Target-specific configurations for different URLs

### New CLI Options

#### Feed Mode Options
- `--feed`: Enable feed ingestion mode
- `--limit <number>`: Maximum items to ingest (default: 50)
- `--yt-lang <code>`: YouTube transcript language (default: 'en')
- `--no-yt-transcript`: Skip YouTube transcript extraction
- `--x-rss-template <url>`: Custom X RSS template URL
- `--bsky-api-base <url>`: Custom Bluesky API endpoint

#### Configuration Options
- `--config <path>`: Path to YAML configuration file

### Technical Improvements

- **Enhanced XML Parsing**: Replaced regex-based parsing with `fast-xml-parser` for robust RSS/Atom support
- **Modular Architecture**: New `src/sources/` module with dedicated handlers for each feed type
- **Zero New Dependencies**: Uses Bun's native fetch and optimized XML parsing
- **Comprehensive Tests**: Added 200+ tests for new feed functionality

### Breaking Changes

- **Configuration Precedence**: CLI arguments now override config file settings (previous behavior was reversed)

### Example Usage

```bash
# RSS Feed
inform --feed https://blog.example.com/rss.xml --limit 100

# YouTube Channel with Transcripts
inform --feed https://www.youtube.com/c/ExampleChannel --yt-lang en

# Bluesky Profile
inform --feed https://bsky.app/profile/example.bsky.social

# Using Config File
inform --config inform.yml https://docs.example.com
```

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

# Feed ingestion (NEW in v0.2.0)
inform --feed https://blog.example.com/rss.xml
inform --feed https://www.youtube.com/c/ExampleChannel
inform --feed https://bsky.app/profile/example.bsky.social

# Using YAML configuration (NEW in v0.2.0)
inform --config inform.yml https://docs.example.com

# Output raw HTML without Markdown conversion
inform https://docs.example.com --raw --output-dir ./raw-content

# Filter files with glob patterns
inform https://github.com/owner/repo --include "*.md" --exclude "node_modules/**"
```

## Features

- **🚀 Powered by Bun**: Significantly faster than Node.js with built-in optimizations
- **⚡ Concurrent Crawling**: Process multiple pages simultaneously for better performance
- **📡 Feed Ingestion**: Download content from RSS, YouTube, Bluesky, and X/Twitter
- **⚙️ YAML Configuration**: Use config files for complex crawling setups
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
