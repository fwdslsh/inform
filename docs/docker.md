# Inform Web Crawler

Inform is a high-performance command-line web crawler that downloads web pages and converts them to clean Markdown format.

## Features

- Crawl documentation sites and preserve folder structure
- Converts HTML to Markdown using jsdom and turndown
- Rate limiting and concurrent requests for efficient crawling
- Optimized for memory and speed

## Usage

### Pull the Image

```bash
docker pull fwdslsh/inform:latest
```

### Run the Crawler

```bash
docker run --rm -v $(pwd)/output:/output fwdslsh/inform <url> --max-pages 5 --delay 200 --output-dir /output
```

- Replace `<url>` with the site you want to crawl.
- The output will be saved in the `/output` directory on your host.

### Example

```bash
docker run --rm -v $(pwd)/output:/output fwdslsh/inform http://example.com --max-pages 10 --output-dir /output
```

## CLI Options

- `--max-pages <n>`: Maximum number of pages to crawl
- `--delay <ms>`: Delay between requests (milliseconds)
- `--output-dir <path>`: Directory to save Markdown files
- `--help`: Show help message

## License

Creative Commons Attribution 4.0

---

For full documentation and source code, visit [GitHub](https://github.com/fwdslsh/inform).
