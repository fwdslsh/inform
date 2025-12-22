/**
 * File writer for ingested items
 * Writes IngestItem objects to the filesystem as markdown files
 */

import { join, dirname } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { ensureDir, sanitizeFilename, slugify } from './util.js';
import { renderItemToMarkdown } from './render.js';

/** @typedef {import('./types.js').IngestItem} IngestItem */
/** @typedef {import('./types.js').IngestOptions} IngestOptions */

/**
 * Write multiple items to the filesystem
 * Creates a directory structure: outDir/feeds/<kind>/<filename>.md
 *
 * @param {IngestItem[]} items - Items to write
 * @param {IngestOptions} options - Options including outputDir
 * @returns {Promise<WriteResult>} Write results
 */
export async function writeItems(items, options) {
  const written = [];
  const failed = [];

  for (const item of items) {
    try {
      const path = await writeItem(item, options);
      written.push({ item, path });
    } catch (error) {
      failed.push({ item, error: error.message });
    }
  }

  return { written, failed };
}

/**
 * Write a single item to the filesystem
 *
 * @param {IngestItem} item - Item to write
 * @param {IngestOptions} options - Options
 * @returns {Promise<string>} Path to written file
 */
export async function writeItem(item, options) {
  const baseDir = join(options.outputDir, 'feeds', item.kind);
  await ensureDir(baseDir);

  const filename = generateFilename(item);
  const fullPath = join(baseDir, filename);

  const markdown = renderItemToMarkdown(item);
  await Bun.write(fullPath, markdown);

  return fullPath;
}

/**
 * Generate a filename for an item
 * Format: [YYYY-MM-DD-]<slug>.md
 *
 * @param {IngestItem} item - Item to generate filename for
 * @returns {string} Filename
 */
export function generateFilename(item) {
  const parts = [];

  // Add date prefix if available
  if (item.publishedAt) {
    const date = item.publishedAt.slice(0, 10); // YYYY-MM-DD
    parts.push(date);
  }

  // Add slugified title
  parts.push(slugify(item.title));

  // Join and sanitize
  const basename = sanitizeFilename(parts.join('-'));

  return basename + '.md';
}

/**
 * Generate a unique filename avoiding collisions
 *
 * @param {string} baseDir - Base directory
 * @param {IngestItem} item - Item
 * @returns {Promise<string>} Unique filename
 */
export async function generateUniqueFilename(baseDir, item) {
  const base = generateFilename(item);
  const name = base.replace(/\.md$/, '');
  const ext = '.md';

  let filename = base;
  let counter = 1;

  const file = Bun.file(join(baseDir, filename));

  while (await file.exists()) {
    filename = `${name}-${counter}${ext}`;
    counter++;

    if (counter > 1000) {
      // Safety valve
      throw new Error(`Too many filename collisions for: ${base}`);
    }
  }

  return filename;
}

/**
 * Write items grouped by source
 * Creates separate subdirectories for each source
 *
 * @param {IngestItem[]} items - Items to write
 * @param {IngestOptions} options - Options
 * @param {string} sourceSlug - Slug for the source (e.g., channel name)
 * @returns {Promise<WriteResult>} Write results
 */
export async function writeItemsBySource(items, options, sourceSlug) {
  const written = [];
  const failed = [];

  for (const item of items) {
    try {
      const baseDir = join(options.outputDir, 'feeds', item.kind, sanitizeFilename(sourceSlug));
      await ensureDir(baseDir);

      const filename = generateFilename(item);
      const fullPath = join(baseDir, filename);

      const markdown = renderItemToMarkdown(item);
      await Bun.write(fullPath, markdown);

      written.push({ item, path: fullPath });
    } catch (error) {
      failed.push({ item, error: error.message });
    }
  }

  return { written, failed };
}

/**
 * Write items with deduplication
 * Uses item.id to avoid writing duplicate items
 *
 * @param {IngestItem[]} items - Items to write
 * @param {IngestOptions} options - Options
 * @param {Set<string>} [seenIds] - Set of already-seen IDs (mutated)
 * @returns {Promise<WriteResult>} Write results
 */
export async function writeItemsDeduped(items, options, seenIds = new Set()) {
  const written = [];
  const failed = [];
  const skipped = [];

  for (const item of items) {
    if (seenIds.has(item.id)) {
      skipped.push(item);
      continue;
    }

    seenIds.add(item.id);

    try {
      const path = await writeItem(item, options);
      written.push({ item, path });
    } catch (error) {
      failed.push({ item, error: error.message });
    }
  }

  return { written, failed, skipped };
}

/**
 * @typedef {Object} WriteResult
 * @property {Array<{item: IngestItem, path: string}>} written - Successfully written items
 * @property {Array<{item: IngestItem, error: string}>} failed - Failed items
 * @property {IngestItem[]} [skipped] - Skipped items (if deduping)
 */
