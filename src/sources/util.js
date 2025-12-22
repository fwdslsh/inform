import { mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';

/**
 * Generate SHA1 hash of a string
 * @param {string} input - String to hash
 * @returns {string} Hex-encoded SHA1 hash
 */
export function sha1(input) {
  return createHash('sha1').update(input).digest('hex');
}

/**
 * Convert a string to a URL-safe slug
 * @param {string} s - String to slugify
 * @returns {string} Slugified string
 */
export function slugify(s) {
  return s
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120) || 'item';
}

/**
 * Ensure a directory exists, creating it recursively if needed
 * @param {string} dir - Directory path
 * @returns {Promise<void>}
 */
export async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

/**
 * Convert a date string to ISO format if valid
 * @param {string} [d] - Date string to convert
 * @returns {string | undefined} ISO date string or undefined
 */
export function toIsoDate(d) {
  if (!d) return undefined;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

/**
 * Get text content from an XML element
 * @param {Element | null} [el] - XML element
 * @returns {string | undefined} Text content or undefined
 */
export function pickTextFromXml(el) {
  if (!el) return undefined;
  const t = el.textContent?.trim();
  return t ? t : undefined;
}

/**
 * Return the first non-empty, non-whitespace value
 * @param {...(string | undefined)} vals - Values to check
 * @returns {string | undefined} First valid value
 */
export function first(...vals) {
  for (const v of vals) {
    if (v && v.trim()) return v.trim();
  }
  return undefined;
}

/**
 * Sanitize a string for use as a filename
 * @param {string} name - Filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(name) {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_').slice(0, 180);
}

/**
 * Escape markdown special characters
 * @param {string} s - String to escape
 * @returns {string} Escaped string
 */
export function mdEscape(s) {
  return s.replace(/([\\`*_{}\[\]()#+\-.!|>])/g, '\\$1');
}

/**
 * Strip HTML tags and normalize whitespace
 * Uses Bun's native DOMParser
 * @param {string} html - HTML string to strip
 * @returns {string} Plain text content
 */
export function stripHtml(html) {
  // Handle CDATA and encoded content
  let content = html;

  // Extract CDATA content if present
  const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
  if (cdataMatch) {
    content = cdataMatch[1];
  }

  // Use a simple regex-based approach for stripping HTML
  // This is more reliable than DOMParser for server-side use
  const text = content
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

/**
 * Normalize a URL by adding https:// if missing
 * @param {string} s - URL string
 * @returns {string} Normalized URL
 */
export function normalizeUrl(s) {
  return s.startsWith('http') ? s : `https://${s}`;
}
