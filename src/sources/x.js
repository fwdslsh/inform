/**
 * X (Twitter) feed parser for inform
 * Supports:
 * 1. X API v2 (requires bearer token)
 * 2. RSS fallback (if xRssTemplate is configured)
 */

import { toIsoDate } from './util.js';
import { ingestRss } from './rss.js';

/** @typedef {import('./types.js').IngestItem} IngestItem */
/** @typedef {import('./types.js').IngestOptions} IngestOptions */
/** @typedef {import('./types.js').IngestResult} IngestResult */

/**
 * Ingest posts from an X (Twitter) profile
 * Accepts:
 * - https://x.com/username
 * - https://twitter.com/username
 * - @username
 * - username
 *
 * @param {string} input - X profile URL or username
 * @param {IngestOptions} options - Ingestion options
 * @returns {Promise<IngestResult>} Ingested posts
 */
export async function ingestX(input, options) {
  const username = extractUsername(input);

  if (!username) {
    throw new Error(`Could not extract X username from: ${input}`);
  }

  // Try X API v2 if bearer token is available
  const bearerToken = options.xBearerToken ?? process.env.X_BEARER_TOKEN;

  if (bearerToken) {
    return ingestXApi(username, options, bearerToken);
  }

  // Try RSS fallback if template is configured
  const rssTemplate = options.xRssTemplate ?? process.env.X_RSS_TEMPLATE;

  if (rssTemplate) {
    return ingestXRss(username, rssTemplate, options);
  }

  // No method available - return helpful error
  throw new Error(
    `X ingestion requires either:\n` +
    `  1. X_BEARER_TOKEN environment variable (for API v2)\n` +
    `  2. X_RSS_TEMPLATE environment variable (for RSS fallback, e.g., "https://nitter.example.com/{user}/rss")\n\n` +
    `X API v2 requires authentication. See: https://developer.x.com/en/docs/authentication`
  );
}

/**
 * Ingest using X API v2
 * @param {string} username - X username
 * @param {IngestOptions} options - Options
 * @param {string} bearerToken - API bearer token
 * @returns {Promise<IngestResult>} Ingested posts
 */
async function ingestXApi(username, options, bearerToken) {
  const apiBase = options.xApiBase ?? 'https://api.x.com';
  const limit = Math.min(options.limit ?? 50, 100); // API max is 100

  const headers = {
    'Authorization': `Bearer ${bearerToken}`,
    'Accept': 'application/json',
    'User-Agent': 'Inform/1.0 (X Reader; +https://github.com/fwdslsh/inform)'
  };

  // Step 1: Resolve username to user ID
  const userUrl = `${apiBase}/2/users/by/username/${encodeURIComponent(username)}?user.fields=created_at,description,username,name,profile_image_url`;

  const userRes = await fetch(userUrl, { headers });

  if (!userRes.ok) {
    const errorBody = await userRes.text();
    throw new Error(`X user lookup failed (${userRes.status}): ${username}\n${errorBody}`);
  }

  /** @type {XUserResponse} */
  const userData = await userRes.json();
  const userId = userData.data?.id;

  if (!userId) {
    throw new Error(`X user lookup returned no ID for: ${username}`);
  }

  const displayName = userData.data?.name;

  // Step 2: Fetch user's tweets
  const tweetsUrl =
    `${apiBase}/2/users/${encodeURIComponent(userId)}/tweets?max_results=${limit}` +
    `&tweet.fields=created_at,public_metrics,entities,referenced_tweets,conversation_id,lang` +
    `&expansions=author_id,referenced_tweets.id` +
    `&user.fields=username,name`;

  const tweetsRes = await fetch(tweetsUrl, { headers });

  if (!tweetsRes.ok) {
    const errorBody = await tweetsRes.text();
    throw new Error(`X tweets fetch failed (${tweetsRes.status}): ${username}\n${errorBody}`);
  }

  /** @type {XTweetsResponse} */
  const tweetsData = await tweetsRes.json();

  /** @type {IngestItem[]} */
  const items = [];

  for (const tweet of (tweetsData.data ?? [])) {
    const id = tweet.id;
    const text = tweet.text;
    const createdAt = tweet.created_at;

    // Extract metrics
    const metrics = tweet.public_metrics;
    const likes = metrics?.like_count ?? 0;
    const retweets = metrics?.retweet_count ?? 0;
    const replies = metrics?.reply_count ?? 0;

    // Check for referenced tweets (retweets, quotes, replies)
    const refTweets = tweet.referenced_tweets ?? [];
    const isRetweet = refTweets.some(r => r.type === 'retweeted');
    const isQuote = refTweets.some(r => r.type === 'quoted');
    const isReply = refTweets.some(r => r.type === 'replied_to');

    // Extract hashtags
    const hashtags = (tweet.entities?.hashtags ?? []).map(h => h.tag);

    // Extract mentions
    const mentions = (tweet.entities?.mentions ?? []).map(m => m.username);

    // Extract URLs
    const urls = (tweet.entities?.urls ?? []).map(u => u.expanded_url || u.url);

    // Build title from first line
    const title = text?.split('\n')[0]?.slice(0, 80) || `Tweet ${id}`;

    // Build content with metadata
    let contentText = text;

    if (isRetweet) {
      contentText = `[RT] ${text}`;
    } else if (isQuote) {
      contentText = `[QT] ${text}`;
    } else if (isReply) {
      contentText = `[Reply] ${text}`;
    }

    if (urls.length > 0) {
      contentText += `\n\nLinks:\n${urls.map(u => `- ${u}`).join('\n')}`;
    }

    contentText += `\n\n---\nLikes: ${likes} | Retweets: ${retweets} | Replies: ${replies}`;

    // Build tags
    const tags = ['x'];
    if (hashtags.length > 0) {
      tags.push(...hashtags);
    }
    if (isRetweet) tags.push('retweet');
    if (isQuote) tags.push('quote');
    if (isReply) tags.push('reply');

    items.push({
      kind: 'x',
      id: `x:${id}`,
      url: `https://x.com/${username}/status/${id}`,
      title,
      publishedAt: toIsoDate(createdAt),
      author: displayName ? `${displayName} (@${username})` : `@${username}`,
      contentText,
      tags
    });
  }

  return { kind: 'x', source: `@${username}`, items };
}

/**
 * Ingest using RSS fallback (e.g., Nitter instance)
 * @param {string} username - X username
 * @param {string} rssTemplate - RSS URL template with {user} placeholder
 * @param {IngestOptions} options - Options
 * @returns {Promise<IngestResult>} Ingested posts
 */
async function ingestXRss(username, rssTemplate, options) {
  const feedUrl = rssTemplate.replace(/\{user\}/g, username);

  try {
    const rssResult = await ingestRss(feedUrl, options);

    // Re-tag items as X source
    const items = rssResult.items.map(item => ({
      ...item,
      kind: /** @type {'x'} */ ('x'),
      tags: [...(item.tags ?? []), 'x']
    }));

    return { kind: 'x', source: `@${username}`, items };
  } catch (error) {
    throw new Error(
      `X RSS fallback failed for @${username}\n` +
      `RSS URL: ${feedUrl}\n` +
      `Error: ${error.message}\n\n` +
      `Note: RSS fallback requires a working Nitter instance or similar service.`
    );
  }
}

/**
 * Extract username from various input formats
 * @param {string} input - Input string
 * @returns {string | undefined} Username
 */
function extractUsername(input) {
  const s = input.trim();
  if (!s) return undefined;

  // @username
  if (s.startsWith('@')) {
    return s.slice(1);
  }

  // URL: https://x.com/username or https://twitter.com/username
  if (s.startsWith('http')) {
    try {
      const url = new URL(s);
      if (!url.hostname.includes('x.com') && !url.hostname.includes('twitter.com')) {
        return undefined;
      }

      // Extract first path segment (username)
      const parts = url.pathname.split('/').filter(Boolean);
      const username = parts[0];

      // Skip if it's a system path
      if (['home', 'explore', 'notifications', 'messages', 'settings', 'i'].includes(username)) {
        return undefined;
      }

      return username || undefined;
    } catch {
      return undefined;
    }
  }

  // Plain username
  return s;
}

/**
 * Check if a URL or input looks like X (Twitter)
 * @param {string} input - Input to check
 * @returns {boolean} True if X/Twitter
 */
export function isXUrl(input) {
  if (input.includes('x.com/') || input.includes('twitter.com/')) {
    return true;
  }
  return false;
}

/**
 * @typedef {Object} XUserResponse
 * @property {{id: string, username: string, name?: string}} [data]
 */

/**
 * @typedef {Object} XTweetsResponse
 * @property {Array<XTweet>} [data]
 */

/**
 * @typedef {Object} XTweet
 * @property {string} id
 * @property {string} text
 * @property {string} [created_at]
 * @property {{like_count?: number, retweet_count?: number, reply_count?: number}} [public_metrics]
 * @property {{hashtags?: Array<{tag: string}>, mentions?: Array<{username: string}>, urls?: Array<{url: string, expanded_url?: string}>}} [entities]
 * @property {Array<{type: 'retweeted' | 'quoted' | 'replied_to', id: string}>} [referenced_tweets]
 */
