# Inform

<img src="docs/inform-64.png" alt="Inform logo" width="64" style="float: left; margin-right: 16px; border-radius: 50%;"/>
A high-performance command-line tool powered by **Bun** that crawls websites, extracts main content, and converts pages to Markdown format.

## Features

- **🚀 Powered by Bun** - Significantly faster than Node.js with built-in optimizations  
- **⚡ Native DOM parsing** - Uses Bun's built-in DOMParser for zero-dependency HTML processing
- **⚡ Concurrent crawling** - Process multiple pages simultaneously for better performance
- Crawls websites starting from a base URL
- Stays within the same domain
- **Maintains original folder structure** (e.g., `/docs/button` becomes `docs/button.md`)
- Extracts main content by removing navigation, ads, and other non-content elements
- **Properly converts HTML code examples to markdown code blocks**
- Converts HTML to clean Markdown
- Respects rate limiting with configurable delays
- Saves files with meaningful names based on URL structure
- Skips binary files and non-HTML content
- **Performance monitoring** - Shows processing time for each page
- **Minimal dependencies** - Only essential packages, no heavy DOM libraries

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

### Advanced Installation

See [docs/installation.md](./docs/installation.md) for full instructions, including how to install Inform without Bun using pre-built binaries for Linux, macOS, and Windows.

If you want to use Inform with Bun, you can still install via npm:

```bash
bun add @fwdslsh/inform
```

Or install globally:

```bash
bun install -g @fwdslsh/inform
```

## Usage

### Basic Usage

```bash
inform https://example.com
```

### With Options

```bash
inform https://docs.example.com --max-pages 50 --delay 500 --concurrency 5 --output-dir ./documentation
```

### Git Repository Downloads

```bash
# Download entire repository
inform https://github.com/owner/repo

# Download specific directory
inform https://github.com/owner/repo/tree/main/docs

# Download with filtering
inform https://github.com/owner/repo --include "*.md" --exclude "node_modules/**"
```

## Documentation

### Complete Guides

- **[📖 Documentation Index](./docs/README.md)** - Navigate all available documentation
- **[🚀 Getting Started](./docs/getting-started.md)** - Basic usage, best practices, and troubleshooting
- **[🔗 GitHub Integration](./docs/github-integration.md)** - Download specific directories from GitHub repos
- **[🕷️ Web Crawling](./docs/web-crawling.md)** - Advanced crawling techniques with real examples
- **[🤖 Automation & Scripting](./docs/automation-and-scripting.md)** - CI/CD integration and workflow automation
- **[🔧 fwdslsh Ecosystem](./docs/fwdslsh-ecosystem.md)** - Integration with unify, catalog, and other tools
- **[💡 Examples](./docs/examples.md)** - Real-world use cases and practical scripts

### Quick Examples

**Download docs from fwdslsh/unify repository:**
```bash
inform https://github.com/fwdslsh/unify/tree/main/docs --output-dir ./unify-docs
```

**Download all Scala Play 2.9 documentation:**
```bash
inform https://www.playframework.com/documentation/2.9.x/ \
  --output-dir ./play-docs --max-pages 500 --delay 500
```

**Complete documentation pipeline with fwdslsh tools:**
```bash
# Download with Inform
inform https://docs.example.com --output-dir ./docs

# Process with ecosystem tools
npx @fwdslsh/unify --input ./docs --output ./unified
npx @fwdslsh/catalog ./unified --output ./llms.txt
```

### Command Line Options

- `--max-pages <number>`: Maximum number of pages to crawl (default: 100)
- `--delay <ms>`: Delay between requests in milliseconds (default: 1000)
- `--concurrency <number>`: Number of concurrent requests (default: 3)
- `--output-dir <path>`: Output directory for saved files (default: crawled-pages)
- `--raw`: Output raw HTML content without Markdown conversion
- `--include <pattern>`: Include files matching glob pattern (can be used multiple times)
- `--exclude <pattern>`: Exclude files matching glob pattern (can be used multiple times)
- `--help`: Show help message

## Examples

### Crawl a documentation site with high concurrency

```bash
inform https://docs.example.com --max-pages 50 --delay 500 --concurrency 5
```

### Crawl a blog with custom output directory

```bash
inform https://blog.example.com --output-dir ./blog-content
```

### Quick crawl with minimal delay

```bash
inform https://example.com --max-pages 20 --delay 200
```

### Raw HTML output without Markdown conversion

```bash
inform https://docs.example.com --raw --output-dir ./raw-content
```

## Integration with @fwdslsh/catalog

For users who need LLMS.txt file generation capabilities, we recommend using [`@fwdslsh/catalog`](https://github.com/fwdslsh/catalog) in combination with Inform. This workflow allows you to:

1. **First, use Inform** to crawl and convert web content to clean Markdown
2. **Then, use @fwdslsh/catalog** to generate LLMS.txt files from the Markdown output

### Example Workflow

```bash
# Step 1: Crawl documentation site with Inform
inform https://docs.example.com --output-dir ./docs-content

# Step 2: Generate LLMS.txt files with @fwdslsh/catalog  
npx @fwdslsh/catalog ./docs-content --output llms.txt
```

### Benefits of this approach:

- **Separation of concerns**: Inform focuses on high-quality web crawling and Markdown conversion
- **Flexibility**: Use @fwdslsh/catalog's advanced LLMS.txt generation features with any Markdown content
- **Maintainability**: Each tool can be optimized for its specific purpose
- **Reusability**: Generated Markdown can be used for multiple purposes beyond LLMS.txt generation

For more information about @fwdslsh/catalog, see the [official documentation](https://github.com/fwdslsh/catalog).

## How It Works

1. **URL Validation**: Validates the provided base URL
2. **Content Extraction**: Uses Bun's native HTMLRewriter for efficient, streaming HTML parsing
3. **Smart Content Selection**: Intelligently identifies main content using selectors (main, article, .content, etc.)
4. **Cleanup**: Removes navigation, ads, scripts, and other non-content elements during parsing
5. **Conversion**: Converts clean HTML to Markdown using Turndown
6. **Link Discovery**: Extracts and queues internal links during the streaming parse
7. **Rate Limiting**: Respects delay settings to avoid overwhelming servers
8. **File Naming**: Generates meaningful filenames based on URL structure

### Technical Implementation

- **Zero-dependency HTML parsing**: Uses Bun's built-in `HTMLRewriter` (no jsdom required)
- **Streaming processing**: HTMLRewriter processes HTML as a stream for better memory efficiency
- **Native performance**: All HTML parsing and DOM manipulation uses Bun's optimized native APIs
- **Minimal footprint**: Reduced bundle size by eliminating heavy DOM libraries

## Output

- Files are saved as `.md` (Markdown) files by default, or `.html` (raw HTML) files when using `--raw`
- **Folder structure matches the original website** (e.g., `/docs/api/` becomes `docs/api.md` or `docs/api.html`)
- Root pages become `index.md` or `index.html`
- Query parameters are included in filenames when present
- HTML code examples are converted to proper markdown code blocks (Markdown mode only)

## Content Extraction Strategy

The crawler attempts to find main content using this priority order:

1. `<main>` element
2. `[role="main"]` attribute
3. Common content class names (`.main-content`, `.content`, etc.)
4. `<article>` elements
5. Bootstrap-style containers
6. Fallback to `<body>` content

Unwanted elements are automatically removed:

- Navigation (`nav`, `.menu`, `.navigation`)
- Headers and footers
- Advertisements (`.ad`, `.advertisement`)
- Social sharing buttons
- Comments sections
- Scripts and styles

## Requirements

- **Bun** v1.0.0 or higher (https://bun.sh)
- Internet connection for crawling

## Dependencies

- `jsdom`: For parsing HTML
- `turndown`: For converting HTML to Markdown

## Recent Changes

- Refactored: The main crawler logic is now in `src/WebCrawler.js` for easier testing and maintenance.
- CLI script (`cli.js`) now imports the crawler class and handles argument parsing only.
- Improved modularity and testability.
- Unit tests for the crawler are provided in `tests/test_cli.js`.

## Ethical Use & Terms of Service

**Please respect the work of others when crawling websites.**

- Always review and abide by the target site's robots.txt, terms of service, and copyright policies.
- Do not use this tool for scraping or redistributing proprietary or copyrighted content without permission.
- Use reasonable rate limits and avoid overwhelming servers.

## Roadmap

- **Create Distribution Process**: Add a build process to compile and package `inform` for zero-dependency cross-platform support.
- **Efficient Git Directory Download**: ✅ **COMPLETED** - Add support for downloading only specific directories (e.g., `docs/`) from public git repositories, enabling quick access to documentation without cloning the entire repo.
- **Configurable Extraction**: Allow users to specify custom selectors or extraction rules for different sites.
- **Advanced Filtering**: Add more granular controls for what content is included/excluded.
- **Improved Markdown Conversion**: Enhance code block and table handling for more accurate documentation conversion.

## License

CC-BY
CC-BY
BY
