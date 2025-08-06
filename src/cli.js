#!/usr/bin/env bun

import { WebCrawler } from './WebCrawler.js';

function showHelp() {
  console.log(`
Web Crawler - Download and convert web pages to Markdown (Optimized with Bun)

Usage:
  bun cli.js <base-url> [options]

Arguments:
  base-url    The starting URL to crawl from

Options:
  --max-pages <number>    Maximum number of pages to crawl (default: 100)
  --delay <ms>           Delay between requests in milliseconds (default: 1000)
  --output-dir <path>    Output directory for saved files (default: crawled-pages)
  --concurrency <number>  Number of concurrent requests (default: 3)
  --help                 Show this help message

Examples:
  bun cli.js https://example.com
  bun cli.js https://docs.example.com --max-pages 50 --delay 500 --concurrency 5
  bun cli.js https://blog.example.com --output-dir ./blog-content

Notes:
  - Uses Bun's optimized fetch and file I/O for better performance
  - Supports concurrent crawling for faster processing
  - Maintains original folder structure (e.g., /docs/api becomes docs/api.md)
  - Converts HTML code examples to markdown code blocks
  - Stays within the same domain as the base URL
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const baseUrl = args[0];
  
  // Validate URL
  try {
    new URL(baseUrl);
  } catch (error) {
    console.error('Error: Invalid URL provided');
    console.error('Please provide a valid URL starting with http:// or https://');
    process.exit(1);
  }
  
  // Parse options
  const options = {};
  
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--max-pages':
        options.maxPages = parseInt(value);
        if (isNaN(options.maxPages) || options.maxPages <= 0) {
          console.error('Error: --max-pages must be a positive number');
          process.exit(1);
        }
        break;
      case '--delay':
        options.delay = parseInt(value);
        if (isNaN(options.delay) || options.delay < 0) {
          console.error('Error: --delay must be a non-negative number');
          process.exit(1);
        }
        break;
      case '--output-dir':
        options.outputDir = value;
        break;
      case '--concurrency':
        options.concurrency = parseInt(value);
        if (isNaN(options.concurrency) || options.concurrency <= 0) {
          console.error('Error: --concurrency must be a positive number');
          process.exit(1);
        }
        break;
      default:
        if (flag.startsWith('--')) {
          console.error(`Error: Unknown option ${flag}`);
          process.exit(1);
        }
    }
  }
  
  console.log('🕷️  Web Crawler Starting... (Powered by Bun)\n');
  
  const crawler = new WebCrawler(baseUrl, options);
  
  try {
    await crawler.crawl();
  } catch (error) {
    console.error('\nCrawl failed:', error.message);
    process.exit(1);
  }
}

// Run the crawler
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
