/**
 * Bluesky feed parser for inform
 * Uses the public ATProto XRPC endpoints
 * No authentication required for public profiles
 */

import { toIsoDate } from './util.js';

/** @typedef {import('./types.js').IngestItem} IngestItem */
/** @typedef {import('./types.js').IngestOptions} IngestOptions */
/** @typedef {import('./types.js').IngestResult} IngestResult */

/**
 * Ingest posts from a Bluesky profile
 * Accepts:
 * - https://bsky.app/profile/handle
 * - handle (e.g., user.bsky.social)
 * - @handle
 *
 * @param {string} input - Bluesky profile URL or handle
 * @param {IngestOptions} options - Ingestion options
 * @returns {Promise<IngestResult>} Ingested posts
 */
export async function ingestBluesky(input, options) {
  const apiBase = options.bskyApiBase ?? 'https://public.api.bsky.app';
  const handle = extractHandle(input);

  if (!handle) {
    throw new Error(`Could not extract Bluesky handle from: ${input}`);
  }

  // Resolve handle to DID
  const did = await resolveHandle(apiBase, handle);
  const limit = Math.min(options.limit ?? 50, 100); // API max is 100

  // Fetch author feed
  const feedUrl = `${apiBase}/xrpc/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(did)}&limit=${limit}`;
  const res = await fetch(feedUrl, {
    headers: {
      'User-Agent': 'Inform/1.0 (Bluesky Reader; +https://github.com/fwdslsh/inform)'
    }
  });

  if (!res.ok) {
    throw new Error(`Bluesky feed failed (${res.status}) ${feedUrl}`);
  }

  /** @type {BlueskyFeedResponse} */
  const data = await res.json();

  /** @type {IngestItem[]} */
  const items = [];

  for (const entry of (data.feed ?? [])) {
    const post = entry.post;
    if (!post) continue;

    const record = post.record;
    const uri = post.uri;
    const cid = post.cid;

    const text = record?.text ?? '';
    const createdAt = record?.createdAt;

    // Extract author info
    const author = post.author;
    const authorHandle = author?.handle ?? handle;
    const authorName = author?.displayName;

    // Construct web URL
    const rkey = uri?.split('/').pop() || cid || '';
    const url = (authorHandle && rkey)
      ? `https://bsky.app/profile/${authorHandle}/post/${rkey}`
      : input;

    // Extract images if present
    const embed = post.embed;
    const images = extractImages(embed);

    // Extract reply/quote context
    const replyTo = extractReplyContext(entry);
    const quotedPost = extractQuotedPost(embed);

    // Build title from first line or truncated text
    const title = text
      ? (text.split('\n')[0].slice(0, 80) || 'Bluesky post')
      : 'Bluesky post';

    // Build content with full text and any embedded context
    let contentText = text;
    if (quotedPost) {
      contentText += `\n\n> Quoting @${quotedPost.author}: ${quotedPost.text}`;
    }
    if (images.length > 0) {
      contentText += `\n\n[${images.length} image(s) attached]`;
    }

    // Extract facets (mentions, links, tags) as metadata
    const facets = record?.facets ?? [];
    const mentions = extractMentions(facets);
    const hashtags = extractHashtags(facets);

    // Combine tags
    const tags = ['bluesky'];
    if (hashtags.length > 0) {
      tags.push(...hashtags);
    }

    items.push({
      kind: 'bluesky',
      id: uri || `bsky:${cid}`,
      url,
      title,
      publishedAt: toIsoDate(createdAt),
      author: authorName ? `${authorName} (@${authorHandle})` : `@${authorHandle}`,
      contentText,
      tags
    });
  }

  return { kind: 'bluesky', source: input, items };
}

/**
 * Extract handle from various input formats
 * @param {string} input - Input string
 * @returns {string | undefined} Handle
 */
function extractHandle(input) {
  // https://bsky.app/profile/handle
  try {
    if (input.startsWith('http')) {
      const url = new URL(input);
      if (url.hostname === 'bsky.app') {
        const match = url.pathname.match(/^\/profile\/([^/]+)/);
        return match?.[1];
      }
      // Fallback: last segment
      const parts = url.pathname.split('/').filter(Boolean);
      return parts[parts.length - 1];
    }
  } catch {
    // Not a URL
  }

  // @handle or just handle
  return input.replace(/^@/, '').trim() || undefined;
}

/**
 * Resolve a Bluesky handle to a DID
 * @param {string} apiBase - API base URL
 * @param {string} handle - Bluesky handle
 * @returns {Promise<string>} DID
 */
async function resolveHandle(apiBase, handle) {
  const url = `${apiBase}/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Inform/1.0 (Bluesky Reader; +https://github.com/fwdslsh/inform)'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to resolve Bluesky handle (${res.status}): ${handle}`);
  }

  const data = await res.json();
  const did = data.did;

  if (!did) {
    throw new Error(`Bluesky handle resolution returned no DID: ${handle}`);
  }

  return did;
}

/**
 * Extract image URLs from embed
 * @param {Object} [embed] - Post embed
 * @returns {string[]} Image URLs
 */
function extractImages(embed) {
  const images = [];

  if (!embed) return images;

  // Direct images
  if (embed.images) {
    for (const img of embed.images) {
      if (img.fullsize) images.push(img.fullsize);
      else if (img.thumb) images.push(img.thumb);
    }
  }

  // Images in record embed
  if (embed.media?.images) {
    for (const img of embed.media.images) {
      if (img.fullsize) images.push(img.fullsize);
      else if (img.thumb) images.push(img.thumb);
    }
  }

  return images;
}

/**
 * Extract reply context from feed entry
 * @param {Object} entry - Feed entry
 * @returns {Object | undefined} Reply context
 */
function extractReplyContext(entry) {
  const reply = entry.reply;
  if (!reply) return undefined;

  const parent = reply.parent;
  if (!parent) return undefined;

  return {
    author: parent.author?.handle,
    text: parent.record?.text?.slice(0, 100)
  };
}

/**
 * Extract quoted post from embed
 * @param {Object} [embed] - Post embed
 * @returns {Object | undefined} Quoted post info
 */
function extractQuotedPost(embed) {
  if (!embed) return undefined;

  // Quote embed
  const record = embed.record?.record || embed.record;
  if (record?.text) {
    return {
      author: embed.record?.author?.handle || 'unknown',
      text: record.text.slice(0, 200)
    };
  }

  return undefined;
}

/**
 * Extract mentions from facets
 * @param {Array} facets - Post facets
 * @returns {string[]} Mentioned handles
 */
function extractMentions(facets) {
  const mentions = [];

  for (const facet of facets) {
    for (const feature of (facet.features ?? [])) {
      if (feature.$type === 'app.bsky.richtext.facet#mention') {
        mentions.push(feature.did);
      }
    }
  }

  return mentions;
}

/**
 * Extract hashtags from facets
 * @param {Array} facets - Post facets
 * @returns {string[]} Hashtags (without #)
 */
function extractHashtags(facets) {
  const hashtags = [];

  for (const facet of facets) {
    for (const feature of (facet.features ?? [])) {
      if (feature.$type === 'app.bsky.richtext.facet#tag') {
        hashtags.push(feature.tag);
      }
    }
  }

  return hashtags;
}

/**
 * Check if a URL or input looks like Bluesky
 * @param {string} input - Input to check
 * @returns {boolean} True if Bluesky
 */
export function isBlueskyUrl(input) {
  if (input.includes('bsky.app') || input.includes('bsky.social')) {
    return true;
  }
  // Handle-style input: something.bsky.social
  if (input.includes('.bsky.')) {
    return true;
  }
  return false;
}

/**
 * @typedef {Object} BlueskyFeedResponse
 * @property {Array<{post: BlueskyPost, reply?: Object}>} [feed]
 */

/**
 * @typedef {Object} BlueskyPost
 * @property {string} uri
 * @property {string} cid
 * @property {BlueskyAuthor} [author]
 * @property {BlueskyRecord} [record]
 * @property {Object} [embed]
 */

/**
 * @typedef {Object} BlueskyAuthor
 * @property {string} handle
 * @property {string} [displayName]
 * @property {string} [did]
 */

/**
 * @typedef {Object} BlueskyRecord
 * @property {string} [text]
 * @property {string} [createdAt]
 * @property {Array} [facets]
 */
