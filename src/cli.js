#!/usr/bin/env bun

import { WebCrawler } from './WebCrawler.js';
import { GitCrawler } from './GitCrawler.js';
import { LlmsTxtCrawler } from './LlmsTxtCrawler.js';
import { GitUrlParser } from './GitUrlParser.js';

import pkg from '../package.json';

function showHelp() {
  console.log(`
Inform - Download and convert web pages to Markdown, download files from Git repositories, or download LLMS.txt files

Usage:
  inform <url> [options]

Arguments:
  url             Web URL to crawl, Git repository URL to download from, or LLMS.txt file URL

Options:
  --max-pages <number>    Maximum number of pages to crawl (web mode only, default: 100)
  --delay <ms>           Delay between requests in milliseconds (web mode only, default: 1000)
  --output-dir <path>    Output directory for saved files (default: crawled-pages)
  --concurrency <number>  Number of concurrent requests (web mode only, default: 3)
  --include <pattern>    Include files matching glob pattern (can be used multiple times)
  --exclude <pattern>    Exclude files matching glob pattern (can be used multiple times)
  --llms                 Download LLMS.txt files (probes /llms.txt and /llms-full.txt)
  --version              Show the current version
  --help                 Show this help message

Examples:
  # Web crawling
  inform https://example.com
  inform https://docs.example.com --max-pages 50 --delay 500 --concurrency 5
  inform https://blog.example.com --output-dir ./blog-content

  # Git repository downloading
  inform https://github.com/owner/repo
  inform https://github.com/owner/repo/tree/main/docs
  inform https://github.com/owner/repo --include "*.md" --exclude "node_modules/**"

  # LLMS.txt file downloading
  inform https://example.com/llms.txt
  inform https://docs.example.com --llms
  inform https://example.com/llms.txt --output-dir ./llms-context

Filtering:
  - Use --include to specify glob patterns for files to include
  - Use --exclude to specify glob patterns for files to exclude
  - Multiple patterns can be specified by using the option multiple times
  - Patterns work for all modes (web crawling, git repository, and LLM.txt downloading)

Git Mode:
  - Automatically detected for GitHub URLs
  - Supports branch/ref and subdirectory extraction from URL
  - Downloads files directly without cloning the repository
  - Maintains directory structure in output

LLMS.txt Mode:
  - Automatically detected for URLs ending in /llms.txt, /llms-full.txt, or /llm.txt
  - Use --llms to probe and download LLMS.txt files from a domain
  - Checks canonical locations: /llms.txt and /llms-full.txt
  - Downloads files as plain text (no conversion needed)

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
    console.log(pkg.version);
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
    exclude: [],
    discoverMode: false
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
      case '--llms':
        options.discoverMode = true;
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
  const isLlmsTxtMode = LlmsTxtCrawler.isLlmsTxtUrl(url) || options.discoverMode;
  
  if (isLlmsTxtMode) {
    console.log('📄 LLMS.txt Mode\n');
    const crawlerUrl = options.discoverMode ? LlmsTxtCrawler.getDiscoveryBaseUrl(url) : url;
    const crawler = new LlmsTxtCrawler(crawlerUrl, { ...options, discoverMode: options.discoverMode });
    try {
      await crawler.crawl();
    } catch (error) {
      console.error('\nLLMS.txt download failed:', error.message);
      process.exit(1);
    }
  } else if (isGitMode) {
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
