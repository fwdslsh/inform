/**
 * RSS/Atom feed parser for inform
 * Uses regex-based XML parsing (no external dependencies)
 * Handles common RSS 2.0 and Atom 1.0 fields
 */

import { first, stripHtml, toIsoDate, sha1, parseXml } from './util.js';

/** @typedef {import('./types.js').IngestItem} IngestItem */
/** @typedef {import('./types.js').IngestOptions} IngestOptions */
/** @typedef {import('./types.js').IngestResult} IngestResult */

/**
 * Ingest items from an RSS or Atom feed
 * @param {string} feedUrl - URL of the RSS/Atom feed
 * @param {IngestOptions} options - Ingestion options
 * @returns {Promise<IngestResult>} Ingested feed items
 */
export async function ingestRss(feedUrl, options) {
  const res = await fetch(feedUrl, {
    redirect: 'follow',
    headers: {
      'User-Agent': 'Inform/1.0 (RSS Reader; +https://github.com/fwdslsh/inform)'
    }
  });

  if (!res.ok) {
    throw new Error(`RSS fetch failed (${res.status}) ${feedUrl}`);
  }

  const xml = await res.text();
  const limit = options.limit ?? 50;

  // Detect feed type and parse accordingly
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');
  const isRss = xml.includes('<rss') || xml.includes('<channel');

  /** @type {IngestItem[]} */
  const items = [];

  if (isAtom) {
    items.push(...parseAtomFeed(xml, feedUrl, limit));
  } else if (isRss) {
    items.push(...parseRssFeed(xml, feedUrl, limit));
  } else {
    // Try to detect based on content
    if (xml.includes('<entry>') || xml.includes('<entry ')) {
      items.push(...parseAtomFeed(xml, feedUrl, limit));
    } else if (xml.includes('<item>') || xml.includes('<item ')) {
      items.push(...parseRssFeed(xml, feedUrl, limit));
    } else {
      throw new Error(`Unknown feed format: ${feedUrl}`);
    }
  }

  return { kind: 'rss', source: feedUrl, items };
}

/**
 * Parse RSS 2.0 feed
 * @param {string} xml - XML content
 * @param {string} feedUrl - Source URL
 * @param {number} limit - Max items to parse
 * @returns {IngestItem[]} Parsed items
 */
function parseRssFeed(xml, feedUrl, limit) {
  const items = [];

  // Extract items using regex
  const itemPattern = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;
  let count = 0;

  while ((match = itemPattern.exec(xml)) !== null && count < limit) {
    const itemXml = match[1];
    count++;

    const title = extractTagContent(itemXml, 'title') || 'Untitled';
    const link = extractTagContent(itemXml, 'link') || '';
    const guid = extractTagContent(itemXml, 'guid') || link || sha1(title + '|' + count);
    const pubDate = extractTagContent(itemXml, 'pubDate');
    const author = extractTagContent(itemXml, 'author') ||
                   extractTagContent(itemXml, 'dc:creator') ||
                   extractTagContent(itemXml, 'creator');

    // Content can be in several places
    const contentHtml = extractTagContent(itemXml, 'content:encoded') ||
                        extractTagContent(itemXml, 'encoded') ||
                        extractTagContent(itemXml, 'description') ||
                        extractTagContent(itemXml, 'content');

    const contentText = contentHtml ? stripHtml(contentHtml) : undefined;

    // Extract categories as tags
    const tags = extractMultipleTagContents(itemXml, 'category');

    items.push({
      kind: 'rss',
      id: guid,
      url: link || feedUrl,
      title: stripHtml(title),
      publishedAt: toIsoDate(pubDate),
      author: author ? stripHtml(author) : undefined,
      contentHtml,
      contentText,
      tags: tags.length > 0 ? tags : undefined
    });
  }

  return items;
}

/**
 * Parse Atom 1.0 feed
 * @param {string} xml - XML content
 * @param {string} feedUrl - Source URL
 * @param {number} limit - Max items to parse
 * @returns {IngestItem[]} Parsed items
 */
function parseAtomFeed(xml, feedUrl, limit) {
  const items = [];

  // Extract entries using regex
  const entryPattern = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
  let match;
  let count = 0;

  while ((match = entryPattern.exec(xml)) !== null && count < limit) {
    const entryXml = match[1];
    count++;

    const title = extractTagContent(entryXml, 'title') || 'Untitled';
    const id = extractTagContent(entryXml, 'id') || sha1(title + '|' + count);

    // Atom links are in attributes
    const link = extractAtomLink(entryXml);

    const published = extractTagContent(entryXml, 'published') ||
                      extractTagContent(entryXml, 'updated');

    // Author in Atom is nested: <author><name>...</name></author>
    const authorXml = extractTagContent(entryXml, 'author');
    const author = authorXml ? extractTagContent(authorXml, 'name') : undefined;

    // Content can be in content or summary
    const contentHtml = extractTagContent(entryXml, 'content') ||
                        extractTagContent(entryXml, 'summary');

    const contentText = contentHtml ? stripHtml(contentHtml) : undefined;

    // Extract categories from category tags (Atom uses term attribute)
    const tags = extractAtomCategories(entryXml);

    items.push({
      kind: 'rss',
      id,
      url: link || feedUrl,
      title: stripHtml(title),
      publishedAt: toIsoDate(published),
      author,
      contentHtml,
      contentText,
      tags: tags.length > 0 ? tags : undefined
    });
  }

  return items;
}

/**
 * Extract content from an XML tag
 * Handles CDATA sections
 * @param {string} xml - XML content to search
 * @param {string} tagName - Tag name to extract
 * @returns {string | undefined} Tag content or undefined
 */
function extractTagContent(xml, tagName) {
  // Handle namespaced tags (e.g., dc:creator becomes dc:creator or just creator)
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Try exact match first, then without namespace
  const patterns = [
    new RegExp(`<${escapedTag}[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, 'i'),
    new RegExp(`<[a-z0-9]+:${escapedTag}[^>]*>([\\s\\S]*?)<\\/[a-z0-9]+:${escapedTag}>`, 'i')
  ];

  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match) {
      let content = match[1];

      // Handle CDATA
      const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      if (cdataMatch) {
        content = cdataMatch[1];
      }

      return content.trim();
    }
  }

  return undefined;
}

/**
 * Extract multiple tag contents (for categories, etc.)
 * @param {string} xml - XML content
 * @param {string} tagName - Tag name
 * @returns {string[]} Array of tag contents
 */
function extractMultipleTagContents(xml, tagName) {
  const results = [];
  const pattern = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi');
  let match;

  while ((match = pattern.exec(xml)) !== null) {
    const content = match[1].trim();
    if (content) {
      // Handle CDATA
      const cdataMatch = content.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
      results.push(cdataMatch ? cdataMatch[1].trim() : stripHtml(content));
    }
  }

  return results;
}

/**
 * Extract link from Atom entry (uses href attribute)
 * Prefers alternate links, falls back to any link
 * @param {string} entryXml - Entry XML content
 * @returns {string | undefined} Link URL
 */
function extractAtomLink(entryXml) {
  // Look for alternate link first
  const altMatch = entryXml.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (altMatch) return altMatch[1];

  // Then any link with href
  const linkMatch = entryXml.match(/<link[^>]*href=["']([^"']+)["']/i);
  return linkMatch ? linkMatch[1] : undefined;
}

/**
 * Extract categories from Atom entry (uses term attribute)
 * @param {string} entryXml - Entry XML content
 * @returns {string[]} Category terms
 */
function extractAtomCategories(entryXml) {
  const categories = [];
  const pattern = /<category[^>]*term=["']([^"']+)["']/gi;
  let match;

  while ((match = pattern.exec(entryXml)) !== null) {
    categories.push(match[1]);
  }

  return categories;
}

/**
 * Check if a URL looks like an RSS/Atom feed
 * @param {string} url - URL to check
 * @returns {boolean} True if URL appears to be a feed
 */
export function looksLikeFeed(url) {
  const lower = url.toLowerCase();
  return (
    lower.endsWith('.rss') ||
    lower.endsWith('.xml') ||
    lower.endsWith('.atom') ||
    lower.includes('feed=') ||
    lower.includes('/feed') ||
    lower.includes('/rss') ||
    lower.includes('/atom') ||
    lower.includes('feeds/posts') ||
    lower.includes('/feeds/')
  );
}
