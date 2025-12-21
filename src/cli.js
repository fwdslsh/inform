#!/usr/bin/env bun

import { WebCrawler } from './WebCrawler.js';
import { GitCrawler } from './GitCrawler.js';
import { GitUrlParser } from './GitUrlParser.js';
import { FeedCrawler, isFeedUrl } from './FeedCrawler.js';
import { shouldUseFeedMode } from './sources/index.js';

// Version is embedded at build time or taken from package.json in development
const VERSION = process.env.INFORM_VERSION || '0.1.0';

function showHelp() {
  console.log(`
Inform - Download and convert web pages to Markdown, download files from Git repositories,
         or ingest content from RSS feeds, YouTube, X (Twitter), and Bluesky

Usage:
  inform <url> [options]

Arguments:
  url             Web URL, Git repo URL, feed URL, or social media profile to ingest

Options:
  --max-pages <number>      Maximum number of pages to crawl (web mode only, default: 100)
  --delay <ms>             Delay between requests in milliseconds (web mode only, default: 1000)
  --output-dir <path>      Output directory for saved files (default: crawled-pages)
  --concurrency <number>    Number of concurrent requests (web mode only, default: 3)
  --max-queue-size <number> Maximum URLs in queue before skipping new links (web mode only, default: 10000)
  --max-retries <number>   Maximum retry attempts for failed requests (default: 3)
  --ignore-robots          Ignore robots.txt directives (web mode only, use with caution)
  --raw                    Output raw HTML content without Markdown conversion
  --include <pattern>      Include files matching glob pattern (can be used multiple times)
  --exclude <pattern>      Exclude files matching glob pattern (can be used multiple times)
  --ignore-errors          Exit with code 0 even if some pages/files fail (default: exit 1 on failures)
  --verbose                Enable verbose logging (detailed output)
  --quiet                  Enable quiet mode (errors only)
  --version                Show the current version
  --help                   Show this help message

Feed Mode Options:
  --feed                   Force feed mode (auto-detected for RSS, YouTube, X, Bluesky URLs)
  --limit <number>         Maximum items to fetch from feed (default: 50)
  --yt-lang <code>         YouTube transcript language (default: en)
  --no-yt-transcript       Disable YouTube transcript fetching
  --x-bearer-token <token> X API v2 bearer token (or set X_BEARER_TOKEN env var)
  --x-rss-template <url>   X RSS fallback URL template (e.g., "https://nitter.example.com/{user}/rss")

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

  # RSS/Atom feeds
  inform https://example.com/feed.xml
  inform https://blog.example.com/rss --limit 20

  # YouTube channels and playlists
  inform https://www.youtube.com/@channelname
  inform https://www.youtube.com/playlist?list=PLxxx
  inform https://www.youtube.com/channel/UCxxx --no-yt-transcript

  # Bluesky profiles
  inform https://bsky.app/profile/user.bsky.social
  inform user.bsky.social --limit 100

  # X (Twitter) profiles (requires authentication)
  inform https://x.com/username --x-bearer-token YOUR_TOKEN
  inform @username --x-rss-template "https://nitter.example.com/{user}/rss"

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

Feed Mode:
  - Automatically detected for RSS/Atom, YouTube, Bluesky, and X URLs
  - Supports handle-style inputs (e.g., @username, user.bsky.social)
  - YouTube: Fetches video metadata and transcripts when available
  - Bluesky: Uses public ATProto API (no authentication required)
  - X: Requires API bearer token or RSS fallback template
  - Output: Creates markdown files in feeds/<source>/ subdirectory

Environment Variables:
  X_BEARER_TOKEN     X API v2 bearer token for authenticated requests
  X_RSS_TEMPLATE     X RSS fallback URL template with {user} placeholder
  BSKY_API_BASE      Bluesky API base URL (default: https://public.api.bsky.app)
  GITHUB_TOKEN       GitHub personal access token for higher API rate limits
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
  
  // Validate URL (allow handle-style inputs for feed mode)
  const isHandleInput = url.startsWith('@') || url.includes('.bsky.');
  if (!isHandleInput) {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch (error) {
      console.error('Error: Invalid URL provided');
      console.error('Please provide a valid URL starting with http:// or https://');
      console.error('Or use a handle format like @username or user.bsky.social');
      process.exit(1);
    }
  }

  // Parse options
  const options = {
    include: [],
    exclude: [],
    // Feed mode defaults
    limit: 50,
    ytLang: 'en',
    ytIncludeTranscript: true
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
      case '--max-retries':
        options.maxRetries = parseInt(value);
        if (isNaN(options.maxRetries) || options.maxRetries < 0) {
          console.error('Error: --max-retries must be a non-negative number');
          process.exit(1);
        }
        i++; // Skip the value in next iteration
        break;
      case '--ignore-robots':
        options.ignoreRobots = true;
        // No need to skip next argument as this is a boolean flag
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
      case '--verbose':
        options.logLevel = 'verbose';
        // No need to skip next argument as this is a boolean flag
        break;
      case '--quiet':
        options.logLevel = 'quiet';
        // No need to skip next argument as this is a boolean flag
        break;
      // Feed mode options
      case '--feed':
        options.feedMode = true;
        break;
      case '--limit':
        options.limit = parseInt(value);
        if (isNaN(options.limit) || options.limit <= 0) {
          console.error('Error: --limit must be a positive number');
          process.exit(1);
        }
        i++;
        break;
      case '--yt-lang':
        if (!value) {
          console.error('Error: --yt-lang requires a language code');
          process.exit(1);
        }
        options.ytLang = value;
        i++;
        break;
      case '--no-yt-transcript':
        options.ytIncludeTranscript = false;
        break;
      case '--x-bearer-token':
        if (!value) {
          console.error('Error: --x-bearer-token requires a token');
          process.exit(1);
        }
        options.xBearerToken = value;
        i++;
        break;
      case '--x-rss-template':
        if (!value) {
          console.error('Error: --x-rss-template requires a URL template');
          process.exit(1);
        }
        options.xRssTemplate = value;
        i++;
        break;
      case '--bsky-api-base':
        if (!value) {
          console.error('Error: --bsky-api-base requires a URL');
          process.exit(1);
        }
        options.bskyApiBase = value;
        i++;
        break;
      default:
        if (flag.startsWith('--')) {
          console.error(`Error: Unknown option ${flag}`);
          process.exit(1);
        }
    }
  }

  // Validate that --verbose and --quiet are not both set
  if (args.includes('--verbose') && args.includes('--quiet')) {
    console.error('Error: Cannot use both --verbose and --quiet options together');
    process.exit(1);
  }

  // Determine the crawler mode based on URL and options
  const isGitMode = GitUrlParser.isGitUrl(url);
  const isFeedMode = options.feedMode || (!isGitMode && shouldUseFeedMode(url));

  if (isFeedMode) {
    console.log('📡 Feed Mode\n');
    const crawler = new FeedCrawler(url, options);
    try {
      await crawler.crawl();
      // Exit with error code if there were failures and ignoreErrors is not set
      if (crawler.failures.size > 0 && !options.ignoreErrors) {
        process.exit(1);
      }
    } catch (error) {
      console.error('\nFeed ingestion failed:', error.message);
      if (options.logLevel === 'verbose') {
        console.error(error.stack);
      }
      process.exit(1);
    }
  } else if (isGitMode) {
    console.log('🔗 Git Repository Mode\n');
    const crawler = new GitCrawler(url, options);
    try {
      await crawler.crawl();
      // Exit with error code if there were failures and ignoreErrors is not set
      if (crawler.failures.size > 0 && !options.ignoreErrors) {
        process.exit(1);
      }
    } catch (error) {
      console.error('\nGit download failed:', error.message);
      process.exit(1);
    }
  } else {
    console.log('🕷️  Web Crawler Mode (Powered by Bun)\n');
    const crawler = new WebCrawler(url, options);
    try {
      await crawler.crawl();
      // Exit with error code if there were failures and ignoreErrors is not set
      if (crawler.failures.size > 0 && !options.ignoreErrors) {
        process.exit(1);
      }
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
