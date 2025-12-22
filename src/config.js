/**
 * Configuration file loading and merging for inform
 * Supports YAML config files with global defaults and per-target overrides
 *
 * Merge order (later wins):
 *   defaults < config.globals < config.target < CLI overrides
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

/**
 * Default options applied when not specified elsewhere
 * Uses unified option names where possible across modes
 */
export const DEFAULTS = {
  // Shared options (all modes)
  outputDir: 'crawled-pages',
  maxRetries: 3,
  logLevel: 'normal',
  ignoreErrors: false,
  limit: 100,           // Maximum items (pages for web, items for feeds)
  delay: 2000,          // Delay between requests (ms) - increased to prevent GitHub rate limiting
  concurrency: 3,       // Concurrent requests
  maxQueueSize: 10000,  // Maximum URLs/items in queue

  // Web mode specific
  ignoreRobots: false,
  raw: false,

  // Feed mode specific
  ytLang: 'en',
  ytIncludeTranscript: true
};

/**
 * @typedef {Object} InformOptions
 * Unified options that work across all modes
 *
 * Shared options:
 * @property {string} [outputDir] - Output directory for saved files
 * @property {number} [maxRetries] - Maximum retry attempts for failed requests
 * @property {string} [logLevel] - Logging level: 'quiet', 'normal', or 'verbose'
 * @property {boolean} [ignoreErrors] - Exit 0 even if failures occur
 * @property {string[]} [include] - Glob patterns for files to include
 * @property {string[]} [exclude] - Glob patterns for files to exclude
 * @property {number} [limit] - Maximum items (pages for web, items for feeds)
 * @property {number} [delay] - Delay between requests (ms)
 * @property {number} [concurrency] - Concurrent requests
 * @property {number} [maxQueueSize] - Maximum URLs/items in queue
 *
 * Web mode:
 * @property {boolean} [ignoreRobots] - Ignore robots.txt
 * @property {boolean} [raw] - Output raw HTML
 *
 * Feed mode:
 * @property {string} [ytLang] - YouTube transcript language
 * @property {boolean} [ytIncludeTranscript] - Fetch YouTube transcripts
 * @property {string} [xBearerToken] - X API bearer token
 * @property {string} [xApiBase] - X API base URL
 * @property {string} [xRssTemplate] - X RSS fallback template
 * @property {string} [bskyApiBase] - Bluesky API base URL
 */

/**
 * @typedef {InformOptions & { url: string, kind?: string }} InformTarget
 * A target with URL and optional mode hint
 */

/**
 * @typedef {Object} InformConfig
 * @property {InformOptions} [globals] - Global default options
 * @property {InformTarget[]} [targets] - List of targets with per-target overrides
 */

/**
 * Load configuration from a YAML file
 * @param {string} [configPath] - Path to config file (or uses INFORM_CONFIG env var)
 * @returns {Promise<InformConfig | null>} Parsed config or null if not found
 */
export async function loadConfig(configPath) {
  const path = configPath ?? process.env.INFORM_CONFIG;
  if (!path) return null;

  if (!existsSync(path)) {
    throw new Error(`Config file not found: ${path}`);
  }

  const text = await readFile(path, 'utf8');
  const config = Bun.YAML.parse(text);

  if (!config || typeof config !== 'object') {
    return null;
  }

  // Normalize arrays in globals
  if (config.globals) {
    normalizeArrayFields(config.globals);
  }

  // Normalize arrays in targets
  if (Array.isArray(config.targets)) {
    for (const target of config.targets) {
      normalizeArrayFields(target);
    }
  }

  return config;
}

/**
 * Normalize fields that should be arrays
 * @param {Object} obj - Object to normalize
 */
function normalizeArrayFields(obj) {
  const arrayFields = ['include', 'exclude', 'youtubeLangs'];

  for (const field of arrayFields) {
    if (obj[field] !== undefined) {
      if (!Array.isArray(obj[field])) {
        obj[field] = [String(obj[field])].filter(Boolean);
      } else {
        obj[field] = obj[field].map(String).filter(Boolean);
      }
    }
  }
}

/**
 * Merge multiple option sources with proper precedence
 * Later sources override earlier ones
 *
 * @param {Object} args - Option sources to merge
 * @param {InformOptions} [args.defaults] - Base defaults
 * @param {InformOptions} [args.globals] - Global config options
 * @param {InformOptions} [args.target] - Per-target config options
 * @param {InformOptions} [args.cli] - CLI-provided options
 * @returns {InformOptions} Merged options
 */
export function mergeOptions({ defaults, globals, target, cli }) {
  const result = {};

  // Apply each layer in order
  for (const layer of [defaults, globals, target, cli]) {
    if (!layer) continue;

    for (const [key, value] of Object.entries(layer)) {
      // Skip undefined values (preserves previous layer's value)
      if (value === undefined) continue;

      // Handle array fields specially - CLI replaces, config is additive
      if (Array.isArray(value) && Array.isArray(result[key])) {
        // If this is CLI, replace entirely; otherwise merge
        if (layer === cli) {
          result[key] = value;
        } else {
          result[key] = [...new Set([...result[key], ...value])];
        }
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Extract only CLI-provided options from parsed args
 * This ensures config file values aren't overridden by default CLI values
 *
 * @param {string[]} argv - Raw command line arguments
 * @param {InformOptions} parsed - Parsed options object
 * @returns {InformOptions} Only options that were explicitly provided on CLI
 */
export function extractCliOverrides(argv, parsed) {
  const overrides = {};

  // Map of flag names to option keys
  const flagMap = {
    // Shared options
    '--output-dir': 'outputDir',
    '--max-retries': 'maxRetries',
    '--verbose': 'logLevel',
    '--quiet': 'logLevel',
    '--ignore-errors': 'ignoreErrors',
    '--include': 'include',
    '--exclude': 'exclude',
    '--limit': 'limit',
    '--delay': 'delay',
    '--concurrency': 'concurrency',
    '--max-queue-size': 'maxQueueSize',

    // Web mode
    '--ignore-robots': 'ignoreRobots',
    '--raw': 'raw',

    // Feed mode
    '--feed': 'feedMode',
    '--yt-lang': 'ytLang',
    '--no-yt-transcript': 'ytIncludeTranscript',
    '--x-bearer-token': 'xBearerToken',
    '--x-rss-template': 'xRssTemplate',
    '--bsky-api-base': 'bskyApiBase'
  };

  // Check which flags were actually provided
  for (const [flag, key] of Object.entries(flagMap)) {
    const isPresent = argv.some(arg =>
      arg === flag || arg.startsWith(`${flag}=`)
    );

    if (isPresent && parsed[key] !== undefined) {
      overrides[key] = parsed[key];
    }
  }

  return overrides;
}

/**
 * Resolve environment variables for options that support them
 * @param {InformOptions} options - Options to enhance
 * @returns {InformOptions} Options with env vars resolved
 */
export function resolveEnvVars(options) {
  const result = { ...options };

  // X API token
  if (!result.xBearerToken && process.env.X_BEARER_TOKEN) {
    result.xBearerToken = process.env.X_BEARER_TOKEN;
  }

  // X API base
  if (!result.xApiBase && process.env.X_API_BASE) {
    result.xApiBase = process.env.X_API_BASE;
  }

  // X RSS template
  if (!result.xRssTemplate && process.env.X_RSS_TEMPLATE) {
    result.xRssTemplate = process.env.X_RSS_TEMPLATE;
  }

  // Bluesky API base
  if (!result.bskyApiBase && process.env.BSKY_API_BASE) {
    result.bskyApiBase = process.env.BSKY_API_BASE;
  }

  return result;
}
