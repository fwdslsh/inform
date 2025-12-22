/**
 * Feed source dispatcher for inform
 * Auto-detects source type and routes to appropriate handler
 */

import { ingestRss, looksLikeFeed } from './rss.js';
import { ingestYouTube, isYouTubeUrl } from './youtube.js';
import { ingestX, isXUrl } from './x.js';
import { ingestBluesky, isBlueskyUrl } from './bluesky.js';
import { normalizeUrl } from './util.js';

/** @typedef {import('./types.js').IngestOptions} IngestOptions */
/** @typedef {import('./types.js').IngestResult} IngestResult */
/** @typedef {import('./types.js').SourceKind} SourceKind */

/**
 * Ingest content from any supported source
 * Auto-detects the source type based on URL patterns
 *
 * @param {string} input - URL or identifier to ingest
 * @param {IngestOptions} options - Ingestion options
 * @returns {Promise<IngestResult>} Ingested items
 */
export async function ingestAny(input, options) {
  const kind = detectSourceKind(input);

  switch (kind) {
    case 'youtube':
      return ingestYouTube(input, options);

    case 'bluesky':
      return ingestBluesky(input, options);

    case 'x':
      return ingestX(input, options);

    case 'rss':
      return ingestRss(normalizeUrl(input), options);

    default:
      throw new Error(`Unsupported feed source: ${input}`);
  }
}

/**
 * Detect the source kind from an input URL or identifier
 *
 * @param {string} input - Input to analyze
 * @returns {SourceKind | null} Detected source kind or null
 */
export function detectSourceKind(input) {
  // Check for handle-style inputs FIRST (before URL parsing)
  // These are non-URL identifiers that should be recognized

  // Bluesky handles: user.bsky.social, @user.bsky.social
  if (input.includes('.bsky.')) {
    return 'bluesky';
  }

  // X handles: @username (without domain) - check before URL parsing
  // since @username would become https://@username which parses as a URL
  if (input.startsWith('@') && !input.includes('.') && !input.includes('/')) {
    return 'x';
  }

  // Try to parse as URL
  const url = tryParseUrl(input);

  if (url) {
    // YouTube URLs
    if (isYouTubeUrl(input)) {
      return 'youtube';
    }

    // X/Twitter URLs
    if (isXUrl(input)) {
      return 'x';
    }

    // Bluesky URLs
    if (isBlueskyUrl(input)) {
      return 'bluesky';
    }

    // RSS/Atom feeds (by URL pattern)
    if (looksLikeFeed(input)) {
      return 'rss';
    }

    // Unknown URL - could try RSS as fallback
    return null;
  }

  return null;
}

/**
 * Check if an input is a supported feed source
 *
 * @param {string} input - Input to check
 * @returns {boolean} True if input is a supported feed source
 */
export function isFeedSource(input) {
  return detectSourceKind(input) !== null;
}

/**
 * Check if we should use feed mode for this input
 * More lenient than isFeedSource - includes URL patterns
 *
 * @param {string} input - Input to check
 * @returns {boolean} True if feed mode should be used
 */
export function shouldUseFeedMode(input) {
  // Explicit source detection
  if (isFeedSource(input)) {
    return true;
  }

  // URL pattern matching for common feed patterns
  const lower = input.toLowerCase();
  return (
    lower.includes('youtube.com') ||
    lower.includes('youtu.be') ||
    lower.includes('x.com/') ||
    lower.includes('twitter.com/') ||
    lower.includes('bsky.app') ||
    lower.includes('bsky.social') ||
    lower.includes('/rss') ||
    lower.includes('/feed') ||
    lower.includes('/atom') ||
    lower.endsWith('.rss') ||
    lower.endsWith('.xml') ||
    lower.includes('feed=')
  );
}

/**
 * Try to parse a string as a URL
 *
 * @param {string} s - String to parse
 * @returns {URL | null} Parsed URL or null
 */
function tryParseUrl(s) {
  try {
    return new URL(normalizeUrl(s));
  } catch {
    return null;
  }
}

// Re-export individual ingesters for direct use
export { ingestRss } from './rss.js';
export { ingestYouTube } from './youtube.js';
export { ingestX } from './x.js';
export { ingestBluesky } from './bluesky.js';

// Re-export writers
export { writeItems, writeItem, writeItemsBySource, writeItemsDeduped } from './write.js';

// Re-export renderers
export { renderItemToMarkdown, renderItemsToDigest } from './render.js';

// Re-export utilities
export { normalizeUrl, slugify, sanitizeFilename, sha1 } from './util.js';
