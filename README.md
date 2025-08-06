# Web Crawler

A Node.js command-line tool that crawls websites, extracts main content, and converts pages to Markdown format.

## Features

- Crawls websites starting from a base URL
- Stays within the same domain
- **Maintains original folder structure** (e.g., `/docs/button` becomes `docs/button.md`)
- Extracts main content by removing navigation, ads, and other non-content elements
- **Properly converts HTML code examples to markdown code blocks**
- Converts HTML to clean Markdown
- Respects rate limiting with configurable delays
- Saves files with meaningful names based on URL structure
- Skips binary files and non-HTML content

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Usage

### Basic Usage
```bash
node cli.js https://example.com
```

### With Options
```bash
node cli.js https://docs.example.com --max-pages 50 --delay 500 --output-dir ./documentation
```

### Command Line Options

- `--max-pages <number>`: Maximum number of pages to crawl (default: 100)
- `--delay <ms>`: Delay between requests in milliseconds (default: 1000)
- `--output-dir <path>`: Output directory for saved files (default: crawled-pages)
- `--help`: Show help message

## Examples

### Crawl a documentation site
```bash
node cli.js https://docs.example.com --max-pages 50 --delay 500
```

### Crawl a blog with custom output directory
```bash
node cli.js https://blog.example.com --output-dir ./blog-content
```

### Quick crawl with minimal delay
```bash
node cli.js https://example.com --max-pages 20 --delay 200
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

- Node.js 16.0.0 or higher
- Internet connection for crawling

## Dependencies

- `jsdom`: For parsing HTML
- `turndown`: For converting HTML to Markdown
- `node-fetch`: For making HTTP requests

## License

MIT
