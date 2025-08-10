import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { FileFilter } from './FileFilter.js';

/**
 * LLM.txt file crawler for downloading llm.txt files from websites
 */
export class LlmTxtCrawler {
  constructor(url, options = {}) {
    this.baseUrl = new URL(url);
    this.outputDir = options.outputDir || 'crawled-pages';
    this.discoverMode = options.discoverMode || false;
    this.fileFilter = new FileFilter({
      include: options.include,
      exclude: options.exclude
    });
    this.downloadedCount = 0;
    this.processedUrls = new Set();
    
    // Common llm.txt locations for discovery mode
    this.commonLocations = [
      '/llm.txt',
      '/docs/llm.txt',
      '/api/llm.txt',
      '/documentation/llm.txt',
      '/.well-known/llm.txt'
    ];
  }

  /**
   * Start crawling for llm.txt files
   */
  async crawl() {
    console.log(`Starting LLM.txt download...`);
    console.log(`Base URL: ${this.baseUrl.origin}`);
    console.log(`Mode: ${this.discoverMode ? 'Discovery' : 'Direct download'}`);
    console.log(`Output directory: ${this.outputDir}`);
    
    const filterSummary = this.fileFilter.getSummary();
    if (filterSummary.hasFilters) {
      console.log(`Include patterns: ${filterSummary.includePatterns.join(', ') || 'none'}`);
      console.log(`Exclude patterns: ${filterSummary.excludePatterns.join(', ') || 'none'}`);
    }
    
    await mkdir(this.outputDir, { recursive: true });

    try {
      if (this.discoverMode) {
        await this.discoverLlmTxtFiles();
      } else {
        await this.downloadSingleFile(this.baseUrl.href);
      }
      
      console.log(`\nLLM.txt download complete! Downloaded ${this.downloadedCount} files.`);
      console.log(`Files saved to: ${this.outputDir}/`);
    } catch (error) {
      if (error.message.includes('404')) {
        throw new Error(`LLM.txt file not found at: ${this.baseUrl.href}`);
      }
      throw error;
    }
  }

  /**
   * Download a single llm.txt file
   */
  async downloadSingleFile(url) {
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname;
    
    // Check if this URL should be included based on filters
    if (!this.fileFilter.shouldCrawlUrl(url)) {
      console.log(`⏭️  Skipped (filtered): ${url}`);
      return;
    }

    if (this.processedUrls.has(url)) {
      console.log(`⏭️  Skipped (already processed): ${url}`);
      return;
    }

    this.processedUrls.add(url);

    try {
      console.log(`📄 Downloading: ${url}`);
      const startTime = Date.now();
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`❌ Not found: ${url}`);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      const processingTime = Date.now() - startTime;
      
      // Generate output file path
      const outputPath = this.generateOutputPath(urlPath);
      const fullOutputPath = join(this.outputDir, outputPath);
      
      // Ensure directory exists
      await mkdir(dirname(fullOutputPath), { recursive: true });
      
      // Write the llm.txt content (no conversion needed, it's already text)
      await writeFile(fullOutputPath, content, 'utf8');
      
      this.downloadedCount++;
      console.log(`✅ Saved: ${outputPath} (${content.length} chars, ${processingTime}ms)`);
      
    } catch (error) {
      console.error(`❌ Failed to download ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Discover and download multiple llm.txt files
   */
  async discoverLlmTxtFiles() {
    console.log(`🔍 Discovering llm.txt files...`);
    
    const baseOrigin = this.baseUrl.origin;
    const basePath = this.baseUrl.pathname.endsWith('/') ? this.baseUrl.pathname : this.baseUrl.pathname + '/';
    
    // Generate URLs to check
    const urlsToCheck = [];
    
    // Add common locations at the base path
    for (const location of this.commonLocations) {
      const fullUrl = baseOrigin + basePath.replace(/\/$/, '') + location;
      urlsToCheck.push(fullUrl);
    }
    
    // If we're not at the root, also check root level
    if (basePath !== '/') {
      for (const location of this.commonLocations) {
        const rootUrl = baseOrigin + location;
        urlsToCheck.push(rootUrl);
      }
    }
    
    console.log(`📍 Checking ${urlsToCheck.length} potential locations...`);
    
    // Download files concurrently but with rate limiting
    const downloadPromises = urlsToCheck.map(async (url, index) => {
      // Add small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, index * 100));
      return this.downloadSingleFile(url);
    });
    
    await Promise.allSettled(downloadPromises);
    
    if (this.downloadedCount === 0) {
      console.log(`ℹ️  No llm.txt files found. Checked locations:`);
      urlsToCheck.forEach(url => console.log(`   ${url}`));
    }
  }

  /**
   * Generate output file path for a given URL path
   */
  generateOutputPath(urlPath) {
    // Remove leading slash and ensure it ends with .txt
    let path = urlPath.replace(/^\//, '');
    
    // If it's empty or just a slash, use 'llm.txt'
    if (!path || path === '/') {
      return 'llm.txt';
    }
    
    // If it doesn't end with .txt, add it
    if (!path.endsWith('.txt')) {
      path += '.txt';
    }
    
    // Replace any problematic characters
    path = path.replace(/[<>:"|?*]/g, '_');
    
    return path;
  }

  /**
   * Check if a URL is likely an llm.txt file
   */
  static isLlmTxtUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      return path.endsWith('/llm.txt') || path === '/llm.txt';
    } catch {
      return false;
    }
  }

  /**
   * Extract base URL for discovery mode
   */
  static getDiscoveryBaseUrl(url) {
    try {
      const urlObj = new URL(url);
      // If it's already an llm.txt file, get the directory
      if (urlObj.pathname.endsWith('/llm.txt')) {
        const pathParts = urlObj.pathname.split('/');
        pathParts.pop(); // Remove 'llm.txt'
        urlObj.pathname = pathParts.join('/') + '/';
      }
      return urlObj.href;
    } catch {
      return url;
    }
  }
}