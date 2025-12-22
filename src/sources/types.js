/**
 * Feed source types for inform
 * Supports RSS, YouTube, X (Twitter), and Bluesky sources
 */

/**
 * @typedef {'rss' | 'youtube' | 'x' | 'bluesky'} SourceKind
 */

/**
 * Represents a single ingested item from any feed source
 * @typedef {Object} IngestItem
 * @property {SourceKind} kind - The type of source this item came from
 * @property {string} id - Stable identifier for deduplication (guid, url, uri, etc.)
 * @property {string} url - The URL to the original content
 * @property {string} title - Title of the item
 * @property {string} [publishedAt] - ISO date string if available
 * @property {string} [author] - Author name/handle if available
 * @property {string} [contentText] - Extracted text content (or transcript)
 * @property {string} [contentHtml] - Original HTML content if available
 * @property {string[]} [tags] - Tags/labels for the item
 */

/**
 * Configuration options for feed ingestion
 * @typedef {Object} IngestOptions
 * @property {string} outputDir - Directory to write output files
 * @property {number} [limit=50] - Maximum items to pull from feeds/timelines
 * @property {number} [maxRetries=3] - Maximum retry attempts for failed requests
 * @property {string} [logLevel='normal'] - Logging level: 'quiet', 'normal', or 'verbose'
 * @property {boolean} [ignoreErrors=false] - Continue on errors
 *
 * YouTube-specific options:
 * @property {string} [ytLang='en'] - Preferred language for transcripts
 * @property {boolean} [ytIncludeTranscript=true] - Whether to fetch transcripts
 *
 * X-specific options:
 * @property {string} [xBearerToken] - X API v2 bearer token
 * @property {string} [xApiBase='https://api.x.com'] - X API base URL
 * @property {string} [xRssTemplate] - RSS fallback template (e.g., "https://nitter.net/{user}/rss")
 *
 * Bluesky-specific options:
 * @property {string} [bskyApiBase='https://public.api.bsky.app'] - Bluesky API base URL
 */

/**
 * Result from ingesting a feed source
 * @typedef {Object} IngestResult
 * @property {SourceKind} kind - The type of source
 * @property {string} source - The original input URL/identifier
 * @property {IngestItem[]} items - Ingested items
 */

// Export empty object to make this a valid ES module
// Types are defined via JSDoc for runtime compatibility
export {};
