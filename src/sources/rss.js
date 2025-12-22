/**
 * RSS/Atom feed parser for inform
 * Uses fast-xml-parser for reliable XML parsing
 * Handles common RSS 2.0 and Atom 1.0 fields
 */

import { XMLParser } from 'fast-xml-parser';
import { stripHtml, toIsoDate, sha1 } from './util.js';

/** @typedef {import('./types.js').IngestItem} IngestItem */
/** @typedef {import('./types.js').IngestOptions} IngestOptions */
/** @typedef {import('./types.js').IngestResult} IngestResult */

// Configure XML parser with options optimized for RSS/Atom feeds
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['item', 'entry', 'category', 'link'].includes(name),
  trimValues: true,
  parseTagValue: false, // Keep values as strings
});

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

  // Parse the XML
  const doc = xmlParser.parse(xml);

  /** @type {IngestItem[]} */
  const items = [];

  // Try RSS 2.0 format first
  if (doc.rss?.channel) {
    items.push(...parseRssChannel(doc.rss.channel, feedUrl, limit));
  }
  // Try Atom format
  else if (doc.feed) {
    items.push(...parseAtomFeed(doc.feed, feedUrl, limit));
  }
  // Try RDF format (RSS 1.0)
  else if (doc['rdf:RDF']) {
    const rdf = doc['rdf:RDF'];
    const rdfItems = rdf.item || [];
    items.push(...parseRdfItems(rdfItems, feedUrl, limit));
  }
  else {
    throw new Error(`Unknown feed format: ${feedUrl}`);
  }

  return { kind: 'rss', source: feedUrl, items };
}

/**
 * Parse RSS 2.0 channel
 * @param {Object} channel - Parsed channel object
 * @param {string} feedUrl - Source URL
 * @param {number} limit - Max items to parse
 * @returns {IngestItem[]} Parsed items
 */
function parseRssChannel(channel, feedUrl, limit) {
  const items = [];
  const rawItems = asArray(channel.item).slice(0, limit);

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];

    const title = getTextContent(item.title) || 'Untitled';
    const link = getTextContent(item.link) || '';
    const guid = getTextContent(item.guid) || link || sha1(title + '|' + i);
    const pubDate = getTextContent(item.pubDate);
    const author = getTextContent(item.author) ||
                   getTextContent(item['dc:creator']) ||
                   getTextContent(item.creator);

    // Content can be in several places
    const contentHtml = getTextContent(item['content:encoded']) ||
                        getTextContent(item.encoded) ||
                        getTextContent(item.description) ||
                        getTextContent(item.content);

    const contentText = contentHtml ? stripHtml(contentHtml) : undefined;

    // Extract categories as tags
    const categories = asArray(item.category);
    const tags = categories
      .map(c => getTextContent(c))
      .filter(Boolean);

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
 * @param {Object} feed - Parsed feed object
 * @param {string} feedUrl - Source URL
 * @param {number} limit - Max items to parse
 * @returns {IngestItem[]} Parsed items
 */
function parseAtomFeed(feed, feedUrl, limit) {
  const items = [];
  const entries = asArray(feed.entry).slice(0, limit);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    const title = getTextContent(entry.title) || 'Untitled';
    const id = getTextContent(entry.id) || sha1(title + '|' + i);

    // Atom links are in attributes
    const link = getAtomLink(entry.link);

    const published = getTextContent(entry.published) ||
                      getTextContent(entry.updated);

    // Author in Atom is nested
    const authorObj = entry.author;
    const author = authorObj ? getTextContent(authorObj.name) : undefined;

    // Content can be in content or summary
    const contentHtml = getTextContent(entry.content) ||
                        getTextContent(entry.summary);

    const contentText = contentHtml ? stripHtml(contentHtml) : undefined;

    // Extract categories from category tags (Atom uses term attribute)
    const categories = asArray(entry.category);
    const tags = categories
      .map(c => c['@_term'] || getTextContent(c))
      .filter(Boolean);

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
 * Parse RDF/RSS 1.0 items
 * @param {Array} rdfItems - Array of RDF items
 * @param {string} feedUrl - Source URL
 * @param {number} limit - Max items to parse
 * @returns {IngestItem[]} Parsed items
 */
function parseRdfItems(rdfItems, feedUrl, limit) {
  const items = [];
  const rawItems = asArray(rdfItems).slice(0, limit);

  for (let i = 0; i < rawItems.length; i++) {
    const item = rawItems[i];

    const title = getTextContent(item.title) || 'Untitled';
    const link = getTextContent(item.link) || item['@_rdf:about'] || '';
    const description = getTextContent(item.description) ||
                        getTextContent(item['content:encoded']);

    items.push({
      kind: 'rss',
      id: link || sha1(title + '|' + i),
      url: link || feedUrl,
      title: stripHtml(title),
      publishedAt: toIsoDate(getTextContent(item['dc:date'])),
      author: getTextContent(item['dc:creator']),
      contentHtml: description,
      contentText: description ? stripHtml(description) : undefined
    });
  }

  return items;
}

/**
 * Get text content from a parsed XML node
 * Handles both string values and objects with #text property
 * @param {any} node - Node to extract text from
 * @returns {string | undefined} Text content
 */
function getTextContent(node) {
  if (!node) return undefined;
  if (typeof node === 'string') return node.trim() || undefined;
  if (typeof node === 'object') {
    // Handle CDATA and text content
    const text = node['#text'] ?? node['#cdata-section'] ?? node;
    if (typeof text === 'string') return text.trim() || undefined;
  }
  return undefined;
}

/**
 * Get link URL from Atom link element(s)
 * Prefers alternate links, falls back to any link with href
 * @param {any} linkData - Link data (array or object)
 * @returns {string | undefined} Link URL
 */
function getAtomLink(linkData) {
  const links = asArray(linkData);

  // Prefer alternate link
  for (const link of links) {
    if (link['@_rel'] === 'alternate' && link['@_href']) {
      return link['@_href'];
    }
  }

  // Fall back to first link with href
  for (const link of links) {
    if (link['@_href']) {
      return link['@_href'];
    }
    // Some feeds have href as text content
    const href = getTextContent(link);
    if (href && href.startsWith('http')) {
      return href;
    }
  }

  return undefined;
}

/**
 * Ensure value is an array
 * @param {any} value - Value to convert
 * @returns {Array} Array value
 */
function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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
