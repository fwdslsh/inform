#!/usr/bin/env bun

import { WebCrawler } from './WebCrawler.js';
import { GitCrawler } from './GitCrawler.js';
import { GitUrlParser } from './GitUrlParser.js';
import { FeedCrawler, isFeedUrl } from './FeedCrawler.js';
import { shouldUseFeedMode } from './sources/index.js';
import {
  DEFAULTS,
  loadConfig,
  mergeOptions,
  extractCliOverrides,
  resolveEnvVars
} from './config.js';

// Version is embedded at build time or taken from package.json in development
const VERSION = process.env.INFORM_VERSION || '0.1.0';

function showHelp() {
  console.log(`
Inform - Download and convert web pages to Markdown, download files from Git repositories,
         or ingest content from RSS feeds, YouTube, X (Twitter), and Bluesky

Usage:
  inform <url> [options]
  inform <config.yaml>          # Shortcut for --config
  inform --config <file>

Arguments:
  url             Web URL, Git repo URL, feed URL, or social media profile to ingest
                  If URL ends with .yaml or .yml, it is treated as a config file

Configuration:
  --config <file>          Path to YAML config file (or set INFORM_CONFIG env var)

Shared Options (all modes):
  --output-dir <path>      Output directory for saved files (default: crawled-pages)
  --limit <number>         Maximum items to process (default: 100)
  --delay <ms>             Delay between requests in milliseconds (default: 1000)
  --concurrency <number>   Number of concurrent requests (default: 3)
  --max-queue-size <num>   Maximum URLs/items in queue (default: 10000)
  --max-retries <number>   Maximum retry attempts for failed requests (default: 3)
  --include <pattern>      Include files matching glob pattern (can be used multiple times)
  --exclude <pattern>      Exclude files matching glob pattern (can be used multiple times)
  --ignore-errors          Exit with code 0 even if some pages/files fail
  --verbose                Enable verbose logging (detailed output)
  --quiet                  Enable quiet mode (errors only)
  --version                Show the current version
  --help                   Show this help message

Web Mode Options:
  --ignore-robots          Ignore robots.txt directives (use with caution)
  --raw                    Output raw HTML content without Markdown conversion

Feed Mode Options:
  --feed                   Force feed mode (auto-detected for RSS, YouTube, X, Bluesky URLs)
  --yt-lang <code>         YouTube transcript language (default: en)
  --no-yt-transcript       Disable YouTube transcript fetching
  --x-bearer-token <token> X API v2 bearer token (or set X_BEARER_TOKEN env var)
  --x-rss-template <url>   X RSS fallback URL template (e.g., "https://nitter.example.com/{user}/rss")
  --bsky-api-base <url>    Bluesky API base URL

Examples:
  # Web crawling
  inform https://example.com
  inform https://docs.example.com --limit 50 --delay 500 --concurrency 5

  # Git repository downloading
  inform https://github.com/owner/repo
  inform https://github.com/owner/repo/tree/main/docs --include "*.md"

  # RSS/Atom feeds
  inform https://example.com/feed.xml --limit 20

  # YouTube channels and playlists
  inform https://www.youtube.com/@channelname
  inform https://www.youtube.com/playlist?list=PLxxx --no-yt-transcript

  # Bluesky profiles
  inform https://bsky.app/profile/user.bsky.social --limit 100

  # X (Twitter) profiles (requires authentication)
  inform https://x.com/username --x-bearer-token YOUR_TOKEN

  # Using config file
  inform ./inform.yaml                              # Shortcut syntax
  inform --config ./inform.yaml                     # Explicit syntax
  inform https://example.com --config ./inform.yaml # CLI overrides config

Config File Format (YAML):
  globals:
    outputDir: ./output
    maxRetries: 5
    limit: 100
    include:
      - "*.md"
      - "*.html"

  targets:
    - url: https://example.com/feed.xml
      limit: 20
    - url: https://github.com/owner/repo
      include: ["*.md"]

Environment Variables:
  INFORM_CONFIG      Path to default config file
  X_BEARER_TOKEN     X API v2 bearer token for authenticated requests
  X_RSS_TEMPLATE     X RSS fallback URL template with {user} placeholder
  X_API_BASE         X API base URL (default: https://api.x.com)
  BSKY_API_BASE      Bluesky API base URL (default: https://public.api.bsky.app)
  GITHUB_TOKEN       GitHub personal access token for higher API rate limits
`);
}

/**
 * Check if a path looks like a YAML config file
 * @param {string} path - Path to check
 * @returns {boolean}
 */
function isYamlPath(path) {
  return path.endsWith('.yaml') || path.endsWith('.yml');
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

  // Parse all CLI options first
  const parsedOptions = parseArgs(args);

  // Check if the "URL" is actually a YAML config file (shortcut syntax)
  let configPath = parsedOptions.configPath;
  if (!configPath && parsedOptions.url && isYamlPath(parsedOptions.url)) {
    configPath = parsedOptions.url;
    parsedOptions.url = null; // Clear URL since it's a config file
  }

  // Load config file if specified
  let config = null;
  try {
    config = await loadConfig(configPath);
  } catch (error) {
    console.error(`Error loading config: ${error.message}`);
    process.exit(1);
  }

  // Get only the options explicitly provided on CLI
  const cliOverrides = extractCliOverrides(args, parsedOptions);

  // Determine URL - either from CLI arg or first target in config
  let url = parsedOptions.url;
  let targetConfig = {};

  if (!url && config?.targets?.length > 0) {
    // Use first target from config
    url = config.targets[0].url;
    targetConfig = config.targets[0];
  }

  if (!url) {
    console.error('Error: No URL provided');
    console.error('Please provide a URL or use a config file with targets');
    process.exit(1);
  }

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

  // Merge options with proper precedence: defaults < config.globals < target < CLI
  let options = mergeOptions({
    defaults: DEFAULTS,
    globals: config?.globals,
    target: targetConfig,
    cli: cliOverrides
  });

  // Resolve environment variables
  options = resolveEnvVars(options);

  // Validate mutually exclusive options
  if (options.logLevel === 'verbose' && args.includes('--quiet')) {
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
      if (crawler.failures.size > 0 && !options.ignoreErrors) {
        process.exit(1);
      }
    } catch (error) {
      console.error('\nCrawl failed:', error.message);
      process.exit(1);
    }
  }
}

/**
 * Parse command line arguments
 * @param {string[]} args - Command line arguments
 * @returns {Object} Parsed options
 */
function parseArgs(args) {
  const options = {
    include: [],
    exclude: []
  };

  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    const value = args[i + 1];

    // First non-flag argument is the URL
    if (!flag.startsWith('--') && !flag.startsWith('-')) {
      if (!options.url) {
        options.url = flag;
      }
      continue;
    }

    switch (flag) {
      // Configuration
      case '--config':
        if (!value || value.startsWith('-')) {
          console.error('Error: --config requires a file path');
          process.exit(1);
        }
        options.configPath = value;
        i++;
        break;

      // Shared options
      case '--output-dir':
        options.outputDir = value;
        i++;
        break;
      case '--max-retries':
        options.maxRetries = parseInt(value);
        if (isNaN(options.maxRetries) || options.maxRetries < 0) {
          console.error('Error: --max-retries must be a non-negative number');
          process.exit(1);
        }
        i++;
        break;
      case '--include':
        if (!value || value.startsWith('-')) {
          console.error('Error: --include requires a pattern');
          process.exit(1);
        }
        options.include.push(value);
        i++;
        break;
      case '--exclude':
        if (!value || value.startsWith('-')) {
          console.error('Error: --exclude requires a pattern');
          process.exit(1);
        }
        options.exclude.push(value);
        i++;
        break;
      case '--ignore-errors':
        options.ignoreErrors = true;
        break;
      case '--verbose':
        options.logLevel = 'verbose';
        break;
      case '--quiet':
        options.logLevel = 'quiet';
        break;

      // Shared options (all modes)
      case '--limit':
        options.limit = parseInt(value);
        if (isNaN(options.limit) || options.limit <= 0) {
          console.error('Error: --limit must be a positive number');
          process.exit(1);
        }
        i++;
        break;
      case '--delay':
        options.delay = parseInt(value);
        if (isNaN(options.delay) || options.delay < 0) {
          console.error('Error: --delay must be a non-negative number');
          process.exit(1);
        }
        i++;
        break;
      case '--concurrency':
        options.concurrency = parseInt(value);
        if (isNaN(options.concurrency) || options.concurrency <= 0) {
          console.error('Error: --concurrency must be a positive number');
          process.exit(1);
        }
        i++;
        break;
      case '--max-queue-size':
        options.maxQueueSize = parseInt(value);
        if (isNaN(options.maxQueueSize) || options.maxQueueSize <= 0) {
          console.error('Error: --max-queue-size must be a positive number');
          process.exit(1);
        }
        i++;
        break;

      // Web mode options
      case '--ignore-robots':
        options.ignoreRobots = true;
        break;
      case '--raw':
        options.raw = true;
        break;

      // Feed mode options
      case '--feed':
        options.feedMode = true;
        break;
      case '--yt-lang':
        if (!value || value.startsWith('-')) {
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
        if (!value || value.startsWith('-')) {
          console.error('Error: --x-bearer-token requires a token');
          process.exit(1);
        }
        options.xBearerToken = value;
        i++;
        break;
      case '--x-rss-template':
        if (!value || value.startsWith('-')) {
          console.error('Error: --x-rss-template requires a URL template');
          process.exit(1);
        }
        options.xRssTemplate = value;
        i++;
        break;
      case '--bsky-api-base':
        if (!value || value.startsWith('-')) {
          console.error('Error: --bsky-api-base requires a URL');
          process.exit(1);
        }
        options.bskyApiBase = value;
        i++;
        break;
      case '--x-api-base':
        if (!value || value.startsWith('-')) {
          console.error('Error: --x-api-base requires a URL');
          process.exit(1);
        }
        options.xApiBase = value;
        i++;
        break;

      default:
        if (flag.startsWith('--')) {
          console.error(`Error: Unknown option ${flag}`);
          process.exit(1);
        }
    }
  }

  return options;
}

// Run the crawler
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
