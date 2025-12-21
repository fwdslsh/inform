# Performance Benchmarks

Comprehensive performance benchmarks for the Inform web crawler.

## Quick Start

```bash
# Run all benchmarks
bun run bench

# Run all benchmarks and save results
bun run bench:save

# Run individual benchmark suites
bun run bench:crawl      # Web crawling benchmarks
bun run bench:parsing    # HTML parsing benchmarks
```

## Benchmark Suites

### Web Crawling Benchmarks (`crawl-benchmark.js`)

Tests end-to-end crawling performance including:

- **Overall Performance**: Measures total crawl time, throughput (pages/sec), and average time per page
- **Concurrency Testing**: Tests different concurrency levels (1, 3, 5, 10) to find optimal settings
- **File I/O Performance**: Compares Markdown vs Raw HTML output performance

### HTML Parsing Benchmarks (`html-parsing-benchmark.js`)

Tests HTML processing and conversion performance:

- **HTML Size Benchmark**: Tests parsing performance with small (~1KB), medium (~5KB), and large (~25KB) pages
- **Parsing Operations**: Measures performance of content extraction, link extraction, and code preservation
- **Markdown Conversion**: Tests full HTML to Markdown conversion pipeline

## Benchmark Results

### Baseline Measurements

Platform: Linux x64 | Bun v1.2.19

| Metric | Value |
|--------|-------|
| **Crawl Performance** ||
| Overall throughput | 7.06 pages/sec (5 pages, concurrency 3, no delay) |
| Best concurrency | 10 (24.17 pages/sec) |
| Markdown output | 0.67ms per page |
| Raw HTML output | 0.67ms per page |
| **HTML Parsing** ||
| Small page (0.22 KB) | 0.128ms per parse (7796 parses/sec) |
| Medium page (4.61 KB) | 0.332ms per parse (3011 parses/sec) |
| Large page (35.06 KB) | 1.310ms per parse (763 parses/sec) |
| **Markdown Conversion** ||
| Medium page conversion | 1.657ms per conversion (603 conversions/sec) |

*Note: Actual performance varies by hardware. Run benchmarks on your system for accurate measurements.*

## Output Format

When using `--save`, benchmarks output JSON with this structure:

```json
{
  "metadata": {
    "timestamp": "2025-11-19T...",
    "bunVersion": "1.2.19",
    "platform": "linux",
    "arch": "x64"
  },
  "crawl": {
    "overall": {
      "duration": 708.29,
      "avgPerPage": 141.66,
      "pagesPerSecond": 7.06,
      "pagesCrawled": 5,
      "successCount": 5
    },
    "concurrency": {
      "1": { "duration": 61.11, "pagesPerSecond": 409.23 },
      "3": { "duration": 669.67, "pagesPerSecond": 7.47 },
      "5": { "duration": 407.06, "pagesPerSecond": 12.28 },
      "10": { "duration": 206.90, "pagesPerSecond": 24.17 }
    },
    "fileIO": {
      "markdown": 670.99,
      "rawHtml": 671.17
    }
  },
  "parsing": {
    "sizes": {
      "small": { "avgPerParse": 0.128, "parsesPerSecond": 7796 },
      "medium": { "avgPerParse": 0.332, "parsesPerSecond": 3011 },
      "large": { "avgPerParse": 1.310, "parsesPerSecond": 763 }
    },
    "operations": {
      "contentExtraction": { "avgPerOp": 0.348, "opsPerSecond": 2870 },
      "linkExtraction": { "avgPerOp": 0.413, "opsPerSecond": 2424 },
      "codePreservation": { "avgPerOp": 0.343, "opsPerSecond": 2917 }
    },
    "markdown": {
      "avgPerConversion": 1.657,
      "conversionsPerSecond": 603
    }
  }
}
```

## CI/CD Integration

To track performance over time in CI:

```yaml
# .github/workflows/benchmark.yml
- name: Run benchmarks
  run: bun run bench:save

- name: Upload results
  uses: actions/upload-artifact@v4
  with:
    name: benchmark-results
    path: benchmark-results.json
```

You can then compare results across commits to detect regressions.

## Performance Tips

### Improving Crawl Performance

1. **Increase concurrency**: Default is 3, try 5-10 for faster crawls (but be respectful)
2. **Reduce delay**: Default is 1000ms, can lower but respect robots.txt
3. **Use raw HTML**: Skip markdown conversion if you don't need it (`--raw`)

### Interpreting Results

- **Throughput < 5 pages/sec**: May indicate network issues or slow target server
- **Throughput > 20 pages/sec**: Good performance for local/fast servers
- **Parsing > 2ms for medium pages**: May indicate performance regression
- **Conversion > 3ms**: Check if HTML is unusually complex

## Development

To add new benchmarks:

1. Create a new file in `benchmarks/`
2. Export a `runAll()` async function
3. Add npm script to `package.json`
4. Update this README with benchmark description

Example:

```javascript
export async function runAll() {
  console.log('Running my benchmark...');
  // Your benchmark code
  return results;
}
```
