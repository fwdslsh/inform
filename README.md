# Inform

A high-performance command-line tool powered by **Bun** that crawls websites, extracts main content, and converts pages to Markdown format.

## Features

- **🚀 Powered by Bun** - Significantly faster than Node.js with built-in optimizations
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

## Installation

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
bun cli.js https://example.com
```

### With Options

```bash
bun cli.js https://docs.example.com --max-pages 50 --delay 500 --concurrency 5 --output-dir ./documentation
```

### Command Line Options

- `--max-pages <number>`: Maximum number of pages to crawl (default: 100)
- `--delay <ms>`: Delay between requests in milliseconds (default: 1000)
- `--concurrency <number>`: Number of concurrent requests (default: 3)
- `--output-dir <path>`: Output directory for saved files (default: crawled-pages)
- `--help`: Show help message

## Examples

### Crawl a documentation site with high concurrency

```bash
bun cli.js https://docs.example.com --max-pages 50 --delay 500 --concurrency 5
```

### Crawl a blog with custom output directory

```bash
bun cli.js https://blog.example.com --output-dir ./blog-content
```

### Quick crawl with minimal delay

```bash
bun cli.js https://example.com --max-pages 20 --delay 200
```

## How It Works

1. **URL Validation**: Validates the provided base URL
2. **Content Extraction**: Uses intelligent selectors to find main content (main, article, .content, etc.)
3. **Cleanup**: Removes navigation, ads, scripts, and other non-content elements
4. **Conversion**: Converts clean HTML to Markdown using Turndown
5. **Link Discovery**: Finds and queues internal links for crawling
6. **Rate Limiting**: Respects delay settings to avoid overwhelming servers
7. **File Naming**: Generates meaningful filenames based on URL structure

## Output

- Files are saved as `.md` (Markdown) files
- **Folder structure matches the original website** (e.g., `/docs/api/` becomes `docs/api.md`)
- Root pages become `index.md`
- Query parameters are included in filenames when present
- HTML code examples are converted to proper markdown code blocks

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

- **Create Distribution Process**: Add a build process to compile and package `inform` for zero-dependency cross platform support.
- **Efficient Git Directory Download**: Add support for downloading only specific directories (e.g., `docs/`) from public git repositories, enabling quick access to documentation without cloning the entire repo.
- **Configurable Extraction**: Allow users to specify custom selectors or extraction rules for different sites.
- **Advanced Filtering**: Add more granular controls for what content is included/excluded.
- **Improved Markdown Conversion**: Enhance code block and table handling for more accurate documentation conversion.

## License

CC-BY
