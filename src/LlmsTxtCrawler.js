import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { FileFilter } from './FileFilter.js';

/**
 * LLMS.txt file crawler for downloading llms.txt files from websites
 */
export class LlmsTxtCrawler {
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
    
    // Canonical llms.txt locations for discovery mode
    this.commonLocations = [
      '/llms.txt',
      '/llms-full.txt'
    ];
  }

  /**
   * Start crawling for llm.txt files
   */
  async crawl() {
    console.log(`Starting LLMS.txt download...`);
    console.log(`Base URL: ${this.baseUrl.origin}`);
    console.log(`Mode: ${this.discoverMode ? 'Probe canonical locations' : 'Direct download'}`);
    console.log(`Output directory: ${this.outputDir}`);
    
    const filterSummary = this.fileFilter.getSummary();
    if (filterSummary.hasFilters) {
      console.log(`Include patterns: ${filterSummary.includePatterns.join(', ') || 'none'}`);
      console.log(`Exclude patterns: ${filterSummary.excludePatterns.join(', ') || 'none'}`);
    }
    
    await mkdir(this.outputDir, { recursive: true });

    try {
      if (this.discoverMode) {
        await this.probeLlmsTxtFiles();
      } else {
        await this.downloadSingleFile(this.baseUrl.href);
      }
      
      console.log(`\nLLMS.txt download complete! Downloaded ${this.downloadedCount} files.`);
      console.log(`Files saved to: ${this.outputDir}/`);
    } catch (error) {
      if (error.message.includes('404')) {
        throw new Error(`LLMS.txt file not found at: ${this.baseUrl.href}`);
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
      
      // Write the llms.txt content (no conversion needed, it's already text)
      await writeFile(fullOutputPath, content, 'utf8');
      
      this.downloadedCount++;
      console.log(`✅ Saved: ${outputPath} (${content.length} chars, ${processingTime}ms)`);
      
    } catch (error) {
      console.error(`❌ Failed to download ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Probe canonical locations for llms.txt files
   */
  async probeLlmsTxtFiles() {
    console.log(`🔍 Probing canonical LLMS.txt locations...`);
    
    const baseOrigin = this.baseUrl.origin;
    
    // Generate URLs to check - only canonical locations
    const urlsToCheck = [];
    for (const location of this.commonLocations) {
      const fullUrl = baseOrigin + location;
      urlsToCheck.push(fullUrl);
    }
    
    console.log(`📍 Checking ${urlsToCheck.length} canonical locations...`);
    
    // Download files with rate limiting
    for (const url of urlsToCheck) {
      await this.downloadSingleFile(url);
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (this.downloadedCount === 0) {
      console.log(`ℹ️  No LLMS.txt files found. Checked locations:`);
      urlsToCheck.forEach(url => console.log(`   ${url}`));
    }
  }

  /**
   * Generate output file path for a given URL path
   */
  generateOutputPath(urlPath) {
    // Remove leading slash and ensure it ends with .txt
    let path = urlPath.replace(/^\//, '');
    
    // If it's empty or just a slash, use 'llms.txt' (default to new standard)
    if (!path || path === '/') {
      return 'llms.txt';
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
   * Check if a URL is likely an LLMS.txt file (supports llms.txt, llms-full.txt, and llm.txt for backward compatibility)
   */
  static isLlmsTxtUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.toLowerCase();
      return path.endsWith('/llms.txt') || path === '/llms.txt' ||
             path.endsWith('/llms-full.txt') || path === '/llms-full.txt' ||
             path.endsWith('/llm.txt') || path === '/llm.txt';
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
      // If it's already an llms.txt or llm.txt file, get the directory
      const pathname = urlObj.pathname.toLowerCase();
      if (pathname.endsWith('/llms.txt') || pathname.endsWith('/llms-full.txt') || pathname.endsWith('/llm.txt')) {
        const pathParts = urlObj.pathname.split('/');
        pathParts.pop(); // Remove the filename
        urlObj.pathname = pathParts.join('/') + '/';
      }
      return urlObj.href;
    } catch {
      return url;
    }
  }
}