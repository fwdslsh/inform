import { mkdir, writeFile, readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { FileFilter } from './FileFilter.js';
import { WebCrawler } from './WebCrawler.js';

/**
 * LLMS.txt file crawler for probing canonical locations and generating LLMS.txt files
 */
export class LlmsTxtCrawler {
  constructor(url, options = {}) {
    this.baseUrl = new URL(url);
    this.outputDir = options.outputDir || 'crawled-pages';
    this.fileFilter = new FileFilter({
      include: options.include,
      exclude: options.exclude
    });
    this.downloadedCount = 0;
    this.processedUrls = new Set();
    
    // Canonical llms.txt locations
    this.canonicalLocations = [
      '/llms.txt',
      '/llms-full.txt'
    ];
  }

  /**
   * Start LLMS mode: probe canonical locations, fallback to web crawl + generation
   */
  async crawl() {
    console.log(`Starting LLMS mode...`);
    console.log(`Base URL: ${this.baseUrl.origin}`);
    console.log(`Output directory: ${this.outputDir}`);
    
    const filterSummary = this.fileFilter.getSummary();
    if (filterSummary.hasFilters) {
      console.log(`Include patterns: ${filterSummary.includePatterns.join(', ') || 'none'}`);
      console.log(`Exclude patterns: ${filterSummary.excludePatterns.join(', ') || 'none'}`);
    }
    
    await mkdir(this.outputDir, { recursive: true });

    try {
      // First, probe canonical locations
      const foundFiles = await this.probeCanonicalLocations();
      
      if (foundFiles > 0) {
        console.log(`\nFound and downloaded ${foundFiles} LLMS.txt file(s).`);
        console.log(`Files saved to: ${this.outputDir}/`);
      } else {
        console.log(`\nNo LLMS.txt files found at canonical locations.`);
        console.log(`Switching to web crawling mode to generate LLMS.txt files...`);
        
        // Fallback to web crawling and generation
        await this.crawlAndGenerate();
      }
      
    } catch (error) {
      throw error;
    }
  }

  /**
   * Download a single LLMS.txt file from canonical location
   */
  async downloadSingleFile(url) {
    const urlObj = new URL(url);
    const urlPath = urlObj.pathname;
    
    // Check if this URL should be included based on filters
    if (!this.fileFilter.shouldCrawlUrl(url)) {
      console.log(`⏭️  Skipped (filtered): ${url}`);
      return false;
    }

    if (this.processedUrls.has(url)) {
      console.log(`⏭️  Skipped (already processed): ${url}`);
      return false;
    }

    this.processedUrls.add(url);

    try {
      console.log(`📄 Downloading: ${url}`);
      const startTime = Date.now();
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`❌ Not found: ${url}`);
          return false;
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
      
      return true;
      
    } catch (error) {
      console.error(`❌ Failed to download ${url}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Probe canonical locations for LLMS.txt files
   */
  async probeCanonicalLocations() {
    console.log(`🔍 Probing canonical LLMS.txt locations...`);
    
    const baseOrigin = this.baseUrl.origin;
    let foundCount = 0;
    
    // Generate URLs to check - only canonical locations
    const urlsToCheck = [];
    for (const location of this.canonicalLocations) {
      const fullUrl = baseOrigin + location;
      urlsToCheck.push(fullUrl);
    }
    
    console.log(`📍 Checking ${urlsToCheck.length} canonical locations...`);
    
    // Download files with rate limiting
    for (const url of urlsToCheck) {
      const downloaded = await this.downloadSingleFile(url);
      if (downloaded) {
        foundCount++;
      }
      // Add small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return foundCount;
  }

  /**
   * Fallback: crawl site and generate LLMS.txt files
   */
  async crawlAndGenerate() {
    console.log(`\n🕷️  Starting web crawl to generate LLMS.txt files...`);
    
    // Create a temporary directory for web crawler output
    const tempCrawlDir = join(this.outputDir, '.temp-crawl');
    
    // Set up web crawler with same filtering options but different output dir
    const webCrawler = new WebCrawler(this.baseUrl.href, {
      outputDir: tempCrawlDir,
      include: this.fileFilter.includePatterns,
      exclude: this.fileFilter.excludePatterns,
      maxPages: 100,  // Reasonable limit for LLMS generation
      delay: 300,
      concurrency: 3
    });
    
    try {
      // Perform the web crawl
      await webCrawler.crawl();
      
      // Generate LLMS.txt files from crawled content
      await this.generateLlmsFiles(tempCrawlDir);
      
      // Clean up temporary directory
      await this.cleanupTempDir(tempCrawlDir);
      
      console.log(`\nGenerated LLMS.txt files based on crawled content.`);
      console.log(`Files saved to: ${this.outputDir}/`);
      
    } catch (error) {
      console.error('Failed to crawl and generate LLMS.txt files:', error.message);
      throw error;
    }
  }

  /**
   * Generate LLMS.txt and LLMS-full.txt from crawled markdown files
   */
  async generateLlmsFiles(crawlDir) {
    console.log(`📝 Generating LLMS.txt files from crawled content...`);
    
    try {
      const markdownFiles = await this.collectMarkdownFiles(crawlDir);
      
      if (markdownFiles.length === 0) {
        console.log(`⚠️  No markdown files found to generate LLMS.txt files.`);
        return;
      }
      
      // Generate basic LLMS.txt (summary/important content)
      const llmsContent = await this.generateBasicLlms(markdownFiles);
      const llmsPath = join(this.outputDir, 'llms.txt');
      await writeFile(llmsPath, llmsContent, 'utf8');
      console.log(`✅ Generated: llms.txt (${llmsContent.length} chars)`);
      
      // Generate LLMS-full.txt (all content)
      const llmsFullContent = await this.generateFullLlms(markdownFiles);
      const llmsFullPath = join(this.outputDir, 'llms-full.txt');
      await writeFile(llmsFullPath, llmsFullContent, 'utf8');
      console.log(`✅ Generated: llms-full.txt (${llmsFullContent.length} chars)`);
      
      this.downloadedCount = 2; // We generated 2 files
      
    } catch (error) {
      console.error('Error generating LLMS.txt files:', error.message);
      throw error;
    }
  }

  /**
   * Collect all markdown files from crawl directory
   */
  async collectMarkdownFiles(crawlDir) {
    const markdownFiles = [];
    
    const processDirectory = async (dir) => {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await processDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const content = await readFile(fullPath, 'utf8');
            const relativePath = fullPath.replace(crawlDir + '/', '');
            markdownFiles.push({
              path: relativePath,
              content: content
            });
          }
        }
      } catch (error) {
        // Ignore directory read errors
      }
    };
    
    await processDirectory(crawlDir);
    return markdownFiles;
  }

  /**
   * Generate basic LLMS.txt with key content
   */
  async generateBasicLlms(markdownFiles) {
    const header = `# ${this.baseUrl.hostname} Documentation\n\nGenerated from: ${this.baseUrl.href}\nGenerated at: ${new Date().toISOString()}\n\n`;
    
    let content = header;
    
    // Add index/home page first if available
    const indexFile = markdownFiles.find(f => 
      f.path === 'index.md' || 
      f.path.endsWith('/index.md') || 
      f.path.includes('home') || 
      f.path.includes('README')
    );
    
    if (indexFile) {
      content += `## ${indexFile.path}\n\n${this.truncateContent(indexFile.content, 2000)}\n\n`;
    }
    
    // Add other important files (documentation, guides, etc.)
    const importantFiles = markdownFiles
      .filter(f => f !== indexFile)
      .filter(f => 
        f.path.includes('doc') || 
        f.path.includes('guide') || 
        f.path.includes('tutorial') || 
        f.path.includes('getting-started') ||
        f.path.includes('intro')
      )
      .slice(0, 5); // Limit to prevent huge files
    
    for (const file of importantFiles) {
      content += `## ${file.path}\n\n${this.truncateContent(file.content, 1500)}\n\n`;
    }
    
    return content;
  }

  /**
   * Generate full LLMS.txt with all content
   */
  async generateFullLlms(markdownFiles) {
    const header = `# ${this.baseUrl.hostname} Documentation (Full)\n\nGenerated from: ${this.baseUrl.href}\nGenerated at: ${new Date().toISOString()}\n\n`;
    
    let content = header;
    
    // Add all files with their full content
    for (const file of markdownFiles) {
      content += `## ${file.path}\n\n${file.content}\n\n---\n\n`;
    }
    
    return content;
  }

  /**
   * Truncate content to specified length while preserving structure
   */
  truncateContent(content, maxLength) {
    if (content.length <= maxLength) {
      return content;
    }
    
    const truncated = content.substring(0, maxLength);
    const lastNewline = truncated.lastIndexOf('\n');
    
    if (lastNewline > maxLength * 0.8) {
      return truncated.substring(0, lastNewline) + '\n\n[Content truncated...]';
    }
    
    return truncated + '\n\n[Content truncated...]';
  }

  /**
   * Clean up temporary crawl directory
   */
  async cleanupTempDir(tempDir) {
    try {
      const { rmdir } = await import('fs/promises');
      await rmdir(tempDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
      console.log(`Note: Could not clean up temporary directory: ${tempDir}`);
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
}