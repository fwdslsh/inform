# Getting Started with Inform

Inform is a high-performance command-line web crawler that downloads web pages and converts them to clean Markdown format. It's optimized for crawling documentation sites and downloading files from Git repositories.

## Quick Start

### 1. Installation

The easiest way to get started is with the quick install script:

```bash
curl -fsSL https://raw.githubusercontent.com/fwdslsh/inform/main/install.sh | sh
```

For other installation methods, see [installation.md](./installation.md).

### 2. Basic Usage

#### Crawl a Website

```bash
# Basic website crawling
inform https://example.com

# Crawl with custom output directory
inform https://docs.example.com --output-dir ./my-docs

# Limit pages and add delay
inform https://docs.example.com --max-pages 20 --delay 500
```

#### Download from GitHub Repository

```bash
# Download entire repository
inform https://github.com/owner/repo

# Download specific directory
inform https://github.com/owner/repo/tree/main/docs

# Download with file filtering
inform https://github.com/owner/repo --include "*.md" --exclude "node_modules/**"
```

## Common Use Cases

### 1. Documentation Migration

When migrating documentation from one platform to another:

```bash
# Download all documentation pages
inform https://old-docs.example.com --output-dir ./migrated-docs --max-pages 500

# Filter to only include documentation pages
inform https://docs.example.com --include "docs/**" --exclude "**/admin/**"
```

### 2. Offline Documentation

Create offline copies of documentation:

```bash
# Download with reasonable limits
inform https://docs.framework.com --max-pages 100 --delay 300 --concurrency 2
```

### 3. Content Analysis

Extract content for analysis while preserving structure:

```bash
# Keep raw HTML for analysis tools
inform https://blog.example.com --raw --output-dir ./content-analysis
```

## Command Line Options

### Core Options

- `--output-dir <path>` - Where to save files (default: `crawled-pages`)
- `--max-pages <number>` - Maximum pages to crawl (default: 100)
- `--delay <ms>` - Delay between requests (default: 1000ms)
- `--concurrency <number>` - Concurrent requests (default: 3)

### Filtering Options

- `--include <pattern>` - Include files matching glob pattern
- `--exclude <pattern>` - Exclude files matching glob pattern
- `--raw` - Output raw HTML instead of Markdown

### Output Options

- Files are saved with meaningful names based on URL structure
- Directory structure is preserved (e.g., `/docs/api` becomes `docs/api.md`)
- Code examples are properly converted to Markdown code blocks

## Understanding Output

### File Naming

- Web pages: `https://example.com/docs/guide` → `docs/guide.md`
- Repository files: `docs/README.md` → `docs/README.md`
- Index pages: `https://example.com/docs/` → `docs/index.md`

### Directory Structure

Inform preserves the original structure:

```
Input URL: https://docs.example.com/
├── guide/
│   ├── installation.html
│   └── usage.html
└── api/
    └── reference.html

Output:
crawled-pages/
├── guide/
│   ├── installation.md
│   └── usage.md
└── api/
    └── reference.md
```

## Best Practices

### 1. Respectful Crawling

- Use appropriate delays: `--delay 500` or higher for production sites
- Limit concurrency: `--concurrency 2` for smaller sites
- Set reasonable page limits: `--max-pages 50` for initial tests

### 2. Efficient Filtering

```bash
# Include only documentation
inform https://site.com --include "docs/**" --include "guide/**"

# Exclude common non-content
inform https://site.com --exclude "**/admin/**" --exclude "**/private/**"
```

### 3. Output Organization

```bash
# Use descriptive output directories
inform https://docs.framework.com --output-dir ./framework-docs-$(date +%Y%m%d)

# Separate different content types
inform https://site.com --include "*.md" --output-dir ./markdown-content
```

## Troubleshooting

### Common Issues

1. **Rate Limiting**: Increase delay if you get 429 errors
   ```bash
   inform https://site.com --delay 2000
   ```

2. **Large Sites**: Use pagination and filtering
   ```bash
   inform https://site.com --max-pages 50 --include "docs/**"
   ```

3. **Network Issues**: Reduce concurrency
   ```bash
   inform https://site.com --concurrency 1
   ```

### Getting Help

- Run `inform --help` for full options
- Check logs for specific error messages
- See [GitHub Issues](https://github.com/fwdslsh/inform/issues) for known problems

## Next Steps

- [GitHub Integration Guide](./github-integration.md) - Detailed GitHub repository downloading
- [Web Crawling Guide](./web-crawling.md) - Advanced web crawling techniques  
- [Automation & Scripting](./automation-and-scripting.md) - Integration with scripts and workflows
- [fwdslsh Ecosystem](./fwdslsh-ecosystem.md) - Using with other fwdslsh tools