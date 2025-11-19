#!/usr/bin/env bun

import { WebCrawler } from './WebCrawler.js';
import { GitCrawler } from './GitCrawler.js';
import { GitUrlParser } from './GitUrlParser.js';

// Version is embedded at build time or taken from package.json in development
const VERSION = process.env.INFORM_VERSION || '0.1.0';

function showHelp() {
  console.log(`
Inform - Download and convert web pages to Markdown or download files from Git repositories

Usage:
  inform <url> [options]

Arguments:
  url             Web URL to crawl or Git repository URL to download from

Options:
  --max-pages <number>      Maximum number of pages to crawl (web mode only, default: 100)
  --delay <ms>             Delay between requests in milliseconds (web mode only, default: 1000)
  --output-dir <path>      Output directory for saved files (default: crawled-pages)
  --concurrency <number>    Number of concurrent requests (web mode only, default: 3)
  --max-queue-size <number> Maximum URLs in queue before skipping new links (web mode only, default: 10000)
  --raw                    Output raw HTML content without Markdown conversion
  --include <pattern>      Include files matching glob pattern (can be used multiple times)
  --exclude <pattern>      Exclude files matching glob pattern (can be used multiple times)
  --ignore-errors          Exit with code 0 even if some pages/files fail (default: exit 1 on failures)
  --version                Show the current version
  --help                   Show this help message

Examples:
  # Web crawling
  inform https://example.com
  inform https://docs.example.com --max-pages 50 --delay 500 --concurrency 5
  inform https://blog.example.com --output-dir ./blog-content
  inform https://docs.example.com --raw --output-dir ./raw-content

  # Git repository downloading
  inform https://github.com/owner/repo
  inform https://github.com/owner/repo/tree/main/docs
  inform https://github.com/owner/repo --include "*.md" --exclude "node_modules/**"

Filtering:
  - Use --include to specify glob patterns for files to include
  - Use --exclude to specify glob patterns for files to exclude
  - Multiple patterns can be specified by using the option multiple times
  - Patterns work for all modes (web crawling and git repository downloading)

Git Mode:
  - Automatically detected for GitHub URLs
  - Supports branch/ref and subdirectory extraction from URL
  - Downloads files directly without cloning the repository
  - Maintains directory structure in output

Web Mode:
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
  if (args.includes('--version')) {
    console.log(VERSION);
    process.exit(0);
  }
  
  const url = args[0];
  
  // Validate URL
  try {
    new URL(url);
  } catch (error) {
    console.error('Error: Invalid URL provided');
    console.error('Please provide a valid URL starting with http:// or https://');
    process.exit(1);
  }
  
  // Parse options
  const options = {
    include: [],
    exclude: []
  };
  
  for (let i = 1; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--max-pages':
        options.maxPages = parseInt(value);
        if (isNaN(options.maxPages) || options.maxPages <= 0) {
          console.error('Error: --max-pages must be a positive number');
          process.exit(1);
        }
        i++; // Skip the value in next iteration
        break;
      case '--delay':
        options.delay = parseInt(value);
        if (isNaN(options.delay) || options.delay < 0) {
          console.error('Error: --delay must be a non-negative number');
          process.exit(1);
        }
        i++; // Skip the value in next iteration
        break;
      case '--output-dir':
        options.outputDir = value;
        i++; // Skip the value in next iteration
        break;
      case '--concurrency':
        options.concurrency = parseInt(value);
        if (isNaN(options.concurrency) || options.concurrency <= 0) {
          console.error('Error: --concurrency must be a positive number');
          process.exit(1);
        }
        i++; // Skip the value in next iteration
        break;
      case '--max-queue-size':
        options.maxQueueSize = parseInt(value);
        if (isNaN(options.maxQueueSize) || options.maxQueueSize <= 0) {
          console.error('Error: --max-queue-size must be a positive number');
          process.exit(1);
        }
        i++; // Skip the value in next iteration
        break;
      case '--include':
        if (!value) {
          console.error('Error: --include requires a pattern');
          process.exit(1);
        }
        options.include.push(value);
        i++; // Skip the value in next iteration
        break;
      case '--exclude':
        if (!value) {
          console.error('Error: --exclude requires a pattern');
          process.exit(1);
        }
        options.exclude.push(value);
        i++; // Skip the value in next iteration
        break;
      case '--raw':
        options.raw = true;
        // No need to skip next argument as this is a boolean flag
        break;
      case '--ignore-errors':
        options.ignoreErrors = true;
        // No need to skip next argument as this is a boolean flag
        break;
      default:
        if (flag.startsWith('--')) {
          console.error(`Error: Unknown option ${flag}`);
          process.exit(1);
        }
    }
  }
  
  // Determine the crawler mode based on URL and options
  const isGitMode = GitUrlParser.isGitUrl(url);
  
  if (isGitMode) {
    console.log('🔗 Git Repository Mode\n');
    const crawler = new GitCrawler(url, options);
    try {
      await crawler.crawl();
    } catch (error) {
      console.error('\nGit download failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('🕷️  Web Crawler Mode (Powered by Bun)\n');
    const crawler = new WebCrawler(url, options);
    try {
      await crawler.crawl();
    } catch (error) {
      console.error('\nCrawl failed:', error.message);
      process.exit(1);
    }
  }
}

// Run the crawler
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
