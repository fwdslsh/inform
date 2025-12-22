import { mkdir } from 'fs/promises';
import { join } from 'path';
import {
  ingestAny,
  detectSourceKind,
  writeItems
} from './sources/index.js';

/**
 * Feed crawler for ingesting RSS, YouTube, X, and Bluesky content
 * Follows the same patterns as WebCrawler and GitCrawler
 */
export class FeedCrawler {
  /**
   * Create a new FeedCrawler instance
   * @param {string} sourceUrl - The feed URL or identifier to ingest
   * @param {object} options - Configuration options
   * @param {string} [options.outputDir='crawled-pages'] - Output directory for saved files
   * @param {number} [options.limit=50] - Maximum items to fetch from feed
   * @param {number} [options.maxRetries=3] - Maximum retry attempts for failed requests
   * @param {string} [options.logLevel='normal'] - Logging level: 'quiet', 'normal', or 'verbose'
   * @param {boolean} [options.ignoreErrors=false] - Exit with code 0 even if failures occur
   *
   * YouTube options:
   * @param {string} [options.ytLang='en'] - Preferred language for transcripts
   * @param {boolean} [options.ytIncludeTranscript=true] - Whether to fetch transcripts
   *
   * X options:
   * @param {string} [options.xBearerToken] - X API v2 bearer token (or use X_BEARER_TOKEN env)
   * @param {string} [options.xApiBase='https://api.x.com'] - X API base URL
   * @param {string} [options.xRssTemplate] - RSS fallback template (or use X_RSS_TEMPLATE env)
   *
   * Bluesky options:
   * @param {string} [options.bskyApiBase='https://public.api.bsky.app'] - Bluesky API base URL
   */
  constructor(sourceUrl, options = {}) {
    this.sourceUrl = sourceUrl;
    this.outputDir = options.outputDir || 'crawled-pages';
    this.limit = options.limit ?? 50;
    this.maxRetries = options.maxRetries ?? 3;
    this.logLevel = options.logLevel || 'normal';
    this.ignoreErrors = options.ignoreErrors || false;

    // YouTube options
    this.ytLang = options.ytLang || 'en';
    this.ytIncludeTranscript = options.ytIncludeTranscript ?? true;

    // X options
    this.xBearerToken = options.xBearerToken;
    this.xApiBase = options.xApiBase;
    this.xRssTemplate = options.xRssTemplate;

    // Bluesky options
    this.bskyApiBase = options.bskyApiBase;

    // State tracking (matches WebCrawler/GitCrawler pattern)
    this.failures = new Map(); // item id -> error message
    this.successes = new Set(); // item ids

    // Detect source type
    this.sourceKind = detectSourceKind(sourceUrl);
  }

  /**
   * Log message at normal or verbose level
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.logLevel !== 'quiet') {
      console.log(message);
    }
  }

  /**
   * Log message only at verbose level
   * @param {string} message - Message to log
   */
  logVerbose(message) {
    if (this.logLevel === 'verbose') {
      console.log(message);
    }
  }

  /**
   * Log error message (always shown)
   * @param {...any} args - Arguments to pass to console.error
   */
  logError(...args) {
    console.error(...args);
  }

  /**
   * Log warning message (shown at normal and verbose levels)
   * @param {string} message - Message to log
   */
  logWarn(message) {
    if (this.logLevel !== 'quiet') {
      console.warn(message);
    }
  }

  /**
   * Get the display name for the source kind
   * @returns {string} Human-readable source name
   */
  getSourceName() {
    const names = {
      rss: 'RSS/Atom Feed',
      youtube: 'YouTube',
      bluesky: 'Bluesky',
      x: 'X (Twitter)'
    };
    return names[this.sourceKind] || 'Feed';
  }

  /**
   * Start crawling the feed source
   * @returns {Promise<void>}
   */
  async crawl() {
    const startTime = performance.now();

    this.log(`Starting ${this.getSourceName()} ingestion from: ${this.sourceUrl}`);
    this.log(`Output directory: ${this.outputDir}`);
    this.log(`Item limit: ${this.limit}`);

    // Create output directory
    await mkdir(this.outputDir, { recursive: true });

    // Build options for ingest
    const ingestOptions = {
      outputDir: this.outputDir,
      limit: this.limit,
      maxRetries: this.maxRetries,
      logLevel: this.logLevel,

      // YouTube
      ytLang: this.ytLang,
      ytIncludeTranscript: this.ytIncludeTranscript,

      // X
      xBearerToken: this.xBearerToken,
      xApiBase: this.xApiBase,
      xRssTemplate: this.xRssTemplate,

      // Bluesky
      bskyApiBase: this.bskyApiBase
    };

    try {
      // Ingest items from source
      this.log(`\nFetching feed content...`);
      const result = await ingestAny(this.sourceUrl, ingestOptions);

      this.log(`Found ${result.items.length} items`);
      this.logVerbose(`Source kind: ${result.kind}`);

      // Write items to filesystem
      this.log(`\nWriting items to disk...`);
      const writeResult = await writeItems(result.items, ingestOptions);

      // Track successes and failures
      for (const { item, path } of writeResult.written) {
        this.successes.add(item.id);
        this.logVerbose(`  Saved: ${path}`);
      }

      for (const { item, error } of writeResult.failed) {
        this.failures.set(item.id, error);
        this.logError(`  Failed: ${item.title} - ${error}`);
      }

    } catch (error) {
      this.failures.set(this.sourceUrl, error.message);
      this.logError(`\nFeed ingestion failed:`, error.message);
      if (this.logLevel === 'verbose') {
        this.logError(error.stack);
      }
    }

    const endTime = performance.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    // Display summary
    this.displaySummary(duration);
  }

  /**
   * Display summary of ingestion results
   * @param {string} [duration] - Duration in seconds
   * @returns {boolean} True if there were failures
   */
  displaySummary(duration) {
    console.log(`\nFeed ingestion complete!`);
    if (duration) {
      console.log(`Duration: ${duration}s`);
    }
    console.log(`Items saved to: ${this.outputDir}/feeds/${this.sourceKind || 'feed'}/`);

    console.log('\nSummary:');
    console.log(`  ✓ Successful: ${this.successes.size} items`);
    console.log(`  ✗ Failed: ${this.failures.size} items`);

    if (this.failures.size > 0) {
      console.log('\nFailed Items:');
      for (const [id, error] of this.failures) {
        console.log(`  • ${id} - ${error}`);
      }

      if (!this.ignoreErrors) {
        console.log('\nNote: Ingestion completed with failures (use --ignore-errors to suppress)');
      } else {
        console.log('\nIgnoring errors (--ignore-errors flag set)');
      }
      return true; // Has failures
    }
    return false; // No failures
  }
}

/**
 * Check if a URL is a feed source that should be handled by FeedCrawler
 * @param {string} url - URL to check
 * @returns {boolean} True if this is a feed URL
 */
export function isFeedUrl(url) {
  const kind = detectSourceKind(url);
  return kind !== null;
}
