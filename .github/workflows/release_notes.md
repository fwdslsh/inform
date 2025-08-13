## Usage

```bash
# Crawl a website
inform https://docs.example.com

# With custom options
inform https://docs.example.com --max-pages 50 --delay 500 --concurrency 5

# Download from Git repository
inform https://github.com/owner/repo/tree/main/docs

# Save to custom directory
inform https://example.com --output-dir ./content
```

## Features

- 🚀 **Powered by Bun** - Significantly faster than Node.js
- ⚡ **Concurrent crawling** - Process multiple pages simultaneously
- 📁 **Maintains folder structure** - Preserves original site organization
- 🧹 **Clean Markdown output** - Removes navigation, ads, and non-content
- 🔗 **Git repository support** - Download specific directories from GitHub
- 🎯 **Smart content extraction** - Finds main content automatically

## Integration with Catalog

Inform works seamlessly with [Catalog](https://github.com/fwdslsh/catalog) for complete documentation workflows:

```bash
# Step 1: Crawl with Inform
inform https://docs.example.com --output-dir docs

# Step 2: Generate LLMS artifacts with Catalog
catalog --input docs --output build --generate-index
```

## Documentation

For full documentation, visit the [project repository](https://github.com/fwdslsh/inform).