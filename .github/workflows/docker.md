# Inform Docker Image

High-performance web crawler that extracts content and converts pages to Markdown format.

## Usage

Run Inform in Docker:

```bash
# Crawl a website
docker run --rm -v $(pwd):/output fwdslsh/inform:latest https://docs.example.com

# With custom options
docker run --rm -v $(pwd):/output fwdslsh/inform:latest \
  https://docs.example.com \
  --output-dir /output \
  --max-pages 50 \
  --concurrency 5
```

### Common Options

- `--output-dir <path>`: Output directory for Markdown files (default: current directory)
- `--max-pages <number>`: Maximum pages to crawl (default: 100)
- `--delay <ms>`: Delay between requests in milliseconds (default: 200)
- `--concurrency <number>`: Number of concurrent requests (default: 3)
- `--max-depth <number>`: Maximum crawl depth (default: 10)
- `--help`: Show usage information
- `--version`: Show current version

## Example

```bash
# Crawl documentation site and save to local directory
docker run --rm -v $(pwd)/docs:/output fwdslsh/inform:latest \
  https://docs.example.com \
  --output-dir /output \
  --max-pages 100
```

## Features

- Concurrent crawling with rate limiting
- Smart content extraction
- Clean Markdown output
- Maintains site structure
- Respects robots.txt
- Git repository support

## Documentation

For full documentation and advanced usage, see:

- [GitHub Project](https://github.com/fwdslsh/inform)