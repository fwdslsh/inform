/**
 * YouTube feed parser for inform
 * Parses YouTube channel/playlist RSS feeds and fetches transcripts
 */

import { ingestRss } from './rss.js';
import { first, sha1, stripHtml, normalizeUrl } from './util.js';

/** @typedef {import('./types.js').IngestItem} IngestItem */
/** @typedef {import('./types.js').IngestOptions} IngestOptions */
/** @typedef {import('./types.js').IngestResult} IngestResult */

/**
 * Ingest items from a YouTube channel or playlist
 * Accepts:
 * - https://www.youtube.com/channel/<CHANNEL_ID>
 * - https://www.youtube.com/@handle
 * - https://www.youtube.com/playlist?list=<PLAYLIST_ID>
 * - Direct feed URL (youtube.com/feeds/videos.xml?...)
 *
 * @param {string} input - YouTube URL or handle
 * @param {IngestOptions} options - Ingestion options
 * @returns {Promise<IngestResult>} Ingested video items with optional transcripts
 */
export async function ingestYouTube(input, options) {
  const feedUrl = await toYouTubeFeedUrl(input);
  const rss = await ingestRss(feedUrl, options);

  const ytLang = options.ytLang ?? 'en';
  const includeTranscript = options.ytIncludeTranscript ?? true;

  /** @type {IngestItem[]} */
  const items = [];

  for (const item of rss.items) {
    const videoId = extractVideoId(item.url) || extractVideoIdFromAtomId(item.id);
    let transcript;

    if (includeTranscript && videoId) {
      transcript = await fetchYouTubeTranscript(videoId, ytLang).catch(() => undefined);
    }

    items.push({
      ...item,
      kind: 'youtube',
      id: videoId ? `yt:${videoId}` : `yt:${sha1(item.url)}`,
      contentText: first(transcript, item.contentText),
      tags: [...(item.tags || []), 'youtube']
    });
  }

  return { kind: 'youtube', source: input, items };
}

/**
 * Convert various YouTube URL formats to an RSS feed URL
 * @param {string} input - YouTube URL
 * @returns {Promise<string>} RSS feed URL
 */
async function toYouTubeFeedUrl(input) {
  const url = new URL(normalizeUrl(input));

  // Already a feed URL
  if (url.pathname.includes('/feeds/videos.xml')) {
    return url.href;
  }

  // Playlist URL: /playlist?list=PLAYLIST_ID
  if (url.pathname === '/playlist') {
    const list = url.searchParams.get('list');
    if (!list) {
      throw new Error(`YouTube playlist URL missing ?list=... (${input})`);
    }
    return `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(list)}`;
  }

  // Channel by ID: /channel/CHANNEL_ID
  const channelMatch = url.pathname.match(/^\/channel\/([a-zA-Z0-9_-]+)$/);
  if (channelMatch) {
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelMatch[1])}`;
  }

  // Handle URL: /@username
  if (url.pathname.startsWith('/@')) {
    const channelId = await resolveHandleToChannelId(input);
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  }

  // User URL: /user/USERNAME (legacy)
  const userMatch = url.pathname.match(/^\/user\/([a-zA-Z0-9_-]+)/);
  if (userMatch) {
    // Try to resolve via page scrape
    const channelId = await resolveHandleToChannelId(input);
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  }

  // Custom URL: /c/CUSTOM_NAME
  const customMatch = url.pathname.match(/^\/c\/([a-zA-Z0-9_-]+)/);
  if (customMatch) {
    const channelId = await resolveHandleToChannelId(input);
    return `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
  }

  throw new Error(`Unsupported YouTube URL format: ${input}`);
}

/**
 * Resolve a YouTube handle/user page to a channel ID
 * @param {string} pageUrl - YouTube page URL
 * @returns {Promise<string>} Channel ID
 */
async function resolveHandleToChannelId(pageUrl) {
  const res = await fetch(normalizeUrl(pageUrl), {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Inform/1.0; +https://github.com/fwdslsh/inform)'
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch YouTube page (${res.status}): ${pageUrl}`);
  }

  const html = await res.text();

  // Try multiple patterns to find channel ID
  const patterns = [
    /"channelId":"(UC[a-zA-Z0-9_-]{20,})"/,
    /https:\/\/www\.youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{20,})/,
    /<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]{20,})">/,
    /data-channel-external-id="(UC[a-zA-Z0-9_-]{20,})"/
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }

  throw new Error(`Could not resolve channel ID from: ${pageUrl}`);
}

/**
 * Extract video ID from a YouTube URL
 * @param {string} urlStr - YouTube video URL
 * @returns {string | undefined} Video ID
 */
function extractVideoId(urlStr) {
  try {
    const url = new URL(urlStr);

    // youtu.be/VIDEO_ID
    if (url.hostname === 'youtu.be') {
      return url.pathname.replace('/', '') || undefined;
    }

    // youtube.com/watch?v=VIDEO_ID
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v') || undefined;
    }

    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Extract video ID from Atom entry ID
 * YouTube feed IDs look like: yt:video:VIDEO_ID
 * @param {string} id - Atom entry ID
 * @returns {string | undefined} Video ID
 */
function extractVideoIdFromAtomId(id) {
  const match = id.match(/yt:video:([a-zA-Z0-9_-]{6,})/);
  return match?.[1];
}

/**
 * Fetch YouTube transcript (best effort)
 * Uses the timedtext endpoint for auto-generated captions
 * This won't work for all videos (private, no captions, etc.)
 *
 * @param {string} videoId - YouTube video ID
 * @param {string} lang - Preferred language code
 * @returns {Promise<string | undefined>} Transcript text
 */
async function fetchYouTubeTranscript(videoId, lang) {
  // First, try to get the caption track info from the video page
  const captionUrl = await getCaptionUrl(videoId, lang);

  if (!captionUrl) {
    return undefined;
  }

  const res = await fetch(captionUrl, { redirect: 'follow' });
  if (!res.ok) return undefined;

  const xml = await res.text();
  if (!xml.trim()) return undefined;

  // Parse the transcript XML
  // Format: <transcript><text start="0.0" dur="1.5">Caption text</text>...</transcript>
  // Or: <timedtext><body><p t="0" d="1500">Caption text</p>...</body></timedtext>
  const chunks = [];

  // Try <text> format first
  const textPattern = /<text[^>]*>([^<]*)<\/text>/gi;
  let match;

  while ((match = textPattern.exec(xml)) !== null) {
    const text = stripHtml(decodeXmlEntities(match[1]));
    if (text) chunks.push(text);
  }

  // Try <p> format if no text found
  if (chunks.length === 0) {
    const pPattern = /<p[^>]*>([^<]*)<\/p>/gi;
    while ((match = pPattern.exec(xml)) !== null) {
      const text = stripHtml(decodeXmlEntities(match[1]));
      if (text) chunks.push(text);
    }
  }

  if (chunks.length === 0) return undefined;

  // Join and clean up
  const transcript = chunks.join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\s([.,!?])/g, '$1')
    .trim();

  return transcript || undefined;
}

/**
 * Get the caption URL for a video
 * @param {string} videoId - Video ID
 * @param {string} lang - Language code
 * @returns {Promise<string | undefined>} Caption URL
 */
async function getCaptionUrl(videoId, lang) {
  // Fetch video page to get caption track info
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Inform/1.0; +https://github.com/fwdslsh/inform)'
    }
  });

  if (!res.ok) return undefined;

  const html = await res.text();

  // Look for captions in player config
  const captionMatch = html.match(/"captions":(\{[^}]+\})/);
  if (captionMatch) {
    try {
      // Try to extract base URL from player response
      const baseUrlMatch = html.match(/"baseUrl":"([^"]+timedtext[^"]+)"/);
      if (baseUrlMatch) {
        let captionUrl = baseUrlMatch[1].replace(/\\u0026/g, '&');
        // Add language if not present
        if (!captionUrl.includes('lang=')) {
          captionUrl += `&lang=${lang}`;
        }
        return captionUrl;
      }
    } catch {
      // Continue to fallback
    }
  }

  // Fallback: Try simple timedtext endpoint (works for some videos)
  return `https://www.youtube.com/api/timedtext?lang=${encodeURIComponent(lang)}&v=${encodeURIComponent(videoId)}`;
}

/**
 * Decode XML entities
 * @param {string} text - Text with XML entities
 * @returns {string} Decoded text
 */
function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Check if a URL is a YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean} True if YouTube URL
 */
export function isYouTubeUrl(url) {
  try {
    const u = new URL(normalizeUrl(url));
    return (
      u.hostname.includes('youtube.com') ||
      u.hostname === 'youtu.be'
    );
  } catch {
    return false;
  }
}
