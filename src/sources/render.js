/**
 * Markdown renderer for ingested items
 * Converts IngestItem objects to formatted markdown documents
 */

import { mdEscape } from './util.js';

/** @typedef {import('./types.js').IngestItem} IngestItem */

/**
 * Render an IngestItem to a markdown document
 * @param {IngestItem} item - Item to render
 * @returns {string} Markdown content
 */
export function renderItemToMarkdown(item) {
  const lines = [];

  // Title
  lines.push(`# ${escapeTitle(item.title)}`);
  lines.push('');

  // Metadata section
  lines.push(`- **Source**: ${formatSourceKind(item.kind)}`);

  if (item.author) {
    lines.push(`- **Author**: ${item.author}`);
  }

  if (item.publishedAt) {
    lines.push(`- **Published**: ${formatDate(item.publishedAt)}`);
  }

  if (item.url) {
    lines.push(`- **URL**: <${item.url}>`);
  }

  if (item.tags?.length) {
    lines.push(`- **Tags**: ${item.tags.join(', ')}`);
  }

  lines.push('');

  // Content section
  if (item.contentText?.trim()) {
    lines.push('---');
    lines.push('');
    lines.push(formatContent(item.contentText.trim(), item.kind));
    lines.push('');
  } else if (item.contentHtml?.trim()) {
    lines.push('---');
    lines.push('');
    lines.push('```html');
    lines.push(item.contentHtml.trim());
    lines.push('```');
    lines.push('');
  } else {
    lines.push('---');
    lines.push('');
    lines.push('_No content extracted._');
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Escape markdown in title while keeping it readable
 * @param {string} title - Title text
 * @returns {string} Escaped title
 */
function escapeTitle(title) {
  // Only escape characters that would break the heading
  return title
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

/**
 * Format source kind for display
 * @param {string} kind - Source kind
 * @returns {string} Formatted source name
 */
function formatSourceKind(kind) {
  const names = {
    rss: 'RSS/Atom Feed',
    youtube: 'YouTube',
    bluesky: 'Bluesky',
    x: 'X (Twitter)'
  };
  return names[kind] || kind;
}

/**
 * Format ISO date for display
 * @param {string} isoDate - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(isoDate) {
  try {
    const date = new Date(isoDate);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  } catch {
    return isoDate;
  }
}

/**
 * Format content text with source-specific enhancements
 * @param {string} content - Content text
 * @param {string} kind - Source kind
 * @returns {string} Formatted content
 */
function formatContent(content, kind) {
  let formatted = content;

  // Source-specific formatting
  switch (kind) {
    case 'youtube':
      // For YouTube transcripts, add some paragraph breaks
      formatted = formatTranscript(content);
      break;

    case 'bluesky':
    case 'x':
      // For social posts, preserve line breaks and format links
      formatted = formatSocialPost(content);
      break;

    default:
      // For RSS/general content, clean up whitespace
      formatted = content.replace(/\n{3,}/g, '\n\n');
  }

  return formatted;
}

/**
 * Format a YouTube transcript for readability
 * @param {string} transcript - Raw transcript text
 * @returns {string} Formatted transcript
 */
function formatTranscript(transcript) {
  // Split into sentences and add paragraph breaks every ~5 sentences
  const sentences = transcript.split(/(?<=[.!?])\s+/);
  const paragraphs = [];
  let current = [];

  for (const sentence of sentences) {
    current.push(sentence);
    if (current.length >= 5) {
      paragraphs.push(current.join(' '));
      current = [];
    }
  }

  if (current.length > 0) {
    paragraphs.push(current.join(' '));
  }

  return paragraphs.join('\n\n');
}

/**
 * Format a social media post
 * @param {string} post - Post content
 * @returns {string} Formatted post
 */
function formatSocialPost(post) {
  // Convert URLs to markdown links if they're bare URLs
  const urlPattern = /(?<![(<])(https?:\/\/[^\s)>\]]+)/g;

  return post.replace(urlPattern, '<$1>');
}

/**
 * Render multiple items to a single combined document
 * Useful for creating feed digest files
 * @param {IngestItem[]} items - Items to render
 * @param {Object} [options] - Rendering options
 * @param {string} [options.title] - Document title
 * @param {string} [options.description] - Document description
 * @returns {string} Combined markdown document
 */
export function renderItemsToDigest(items, options = {}) {
  const lines = [];

  // Header
  if (options.title) {
    lines.push(`# ${options.title}`);
    lines.push('');
  } else {
    lines.push('# Feed Digest');
    lines.push('');
  }

  if (options.description) {
    lines.push(options.description);
    lines.push('');
  }

  lines.push(`_Generated: ${new Date().toISOString()}_`);
  lines.push(`_Items: ${items.length}_`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Table of contents
  lines.push('## Contents');
  lines.push('');

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const anchor = `item-${i + 1}`;
    lines.push(`${i + 1}. [${escapeTitle(item.title)}](#${anchor})`);
  }

  lines.push('');
  lines.push('---');
  lines.push('');

  // Items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const anchor = `item-${i + 1}`;

    lines.push(`<a id="${anchor}"></a>`);
    lines.push('');
    lines.push(`## ${i + 1}. ${escapeTitle(item.title)}`);
    lines.push('');
    lines.push(`- **Source**: ${formatSourceKind(item.kind)}`);

    if (item.author) {
      lines.push(`- **Author**: ${item.author}`);
    }

    if (item.publishedAt) {
      lines.push(`- **Published**: ${formatDate(item.publishedAt)}`);
    }

    if (item.url) {
      lines.push(`- **URL**: <${item.url}>`);
    }

    lines.push('');

    if (item.contentText?.trim()) {
      lines.push(formatContent(item.contentText.trim(), item.kind));
    } else {
      lines.push('_No content extracted._');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
}
