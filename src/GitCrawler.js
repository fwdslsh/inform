import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { GitUrlParser } from './GitUrlParser.js';
import { FileFilter } from './FileFilter.js';

/**
 * Git repository crawler for downloading files from Git repositories
 */
export class GitCrawler {
  constructor(gitUrl, options = {}) {
    this.repoInfo = GitUrlParser.parseGitUrl(gitUrl);
    this.outputDir = options.outputDir || 'crawled-pages';
    this.fileFilter = new FileFilter({
      include: options.include,
      exclude: options.exclude
    });
    this.processedFiles = new Set();
    this.downloadedCount = 0;
  }

  /**
   * Start crawling the Git repository
   */
  async crawl() {
    console.log(`Starting Git repository download...`);
    console.log(`Repository: ${this.repoInfo.owner}/${this.repoInfo.repo}`);
    console.log(`Branch: ${this.repoInfo.branch}`);
    if (this.repoInfo.subdirectory) {
      console.log(`Subdirectory: ${this.repoInfo.subdirectory}`);
    }
    console.log(`Output directory: ${this.outputDir}`);
    
    const filterSummary = this.fileFilter.getSummary();
    if (filterSummary.hasFilters) {
      console.log(`Include patterns: ${filterSummary.includePatterns.join(', ') || 'none'}`);
      console.log(`Exclude patterns: ${filterSummary.excludePatterns.join(', ') || 'none'}`);
    }
    
    await mkdir(this.outputDir, { recursive: true });
    
    try {
      await this.downloadDirectory('');
      console.log(`\nGit repository download complete! Downloaded ${this.downloadedCount} files.`);
      console.log(`Files saved to: ${this.outputDir}/`);
    } catch (error) {
      if (error.message.includes('404')) {
        throw new Error(`Repository not found or not accessible: ${this.repoInfo.owner}/${this.repoInfo.repo}`);
      }
      throw error;
    }
  }

  /**
   * Download files from a directory in the repository
   * @param {string} path - Directory path within the repository
   */
  async downloadDirectory(path) {
    const apiUrl = GitUrlParser.getGitHubApiUrl(this.repoInfo, path);
    
    try {
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Inform-GitCrawler/1.0',
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`Directory not found: ${path || 'root'}`);
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }

      const contents = await response.json();
      
      // Handle case where contents is a single file (not an array)
      if (!Array.isArray(contents)) {
        if (contents.type === 'file') {
          await this.downloadFile(contents);
        }
        return;
      }

      // Process all items in the directory
      for (const item of contents) {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        
        if (item.type === 'file') {
          // Check if file should be included based on filters
          if (this.fileFilter.shouldInclude(itemPath)) {
            await this.downloadFile(item);
          }
        } else if (item.type === 'dir') {
          // Recursively download subdirectories
          // Check if directory path could contain files we want
          if (this.shouldExploreDirectory(itemPath)) {
            await this.downloadDirectory(itemPath);
          }
        }
      }
    } catch (error) {
      console.error(`Error downloading directory ${path}:`, error.message);
      throw error;
    }
  }

  /**
   * Download a single file from the repository
   * @param {object} fileInfo - File information from GitHub API
   */
  async downloadFile(fileInfo) {
    const filePath = this.generateLocalPath(fileInfo.path);
    
    // Skip if already processed
    if (this.processedFiles.has(fileInfo.path)) {
      return;
    }
    this.processedFiles.add(fileInfo.path);

    console.log(`Downloading: ${fileInfo.path}`);
    const startTime = performance.now();

    try {
      // For text files, we can get the content directly from the API response
      let content;
      
      if (fileInfo.size <= 1024 * 1024 && fileInfo.content) {
        // File content is available in the API response (base64 encoded)
        content = Buffer.from(fileInfo.content, 'base64').toString('utf8');
      } else {
        // For larger files or when content is not in response, fetch directly
        const response = await fetch(fileInfo.download_url, {
          headers: {
            'User-Agent': 'Inform-GitCrawler/1.0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }
        
        content = await response.text();
      }

      // Create directory if it doesn't exist
      await mkdir(dirname(filePath), { recursive: true });
      
      // Write file content
      await Bun.write(filePath, content);
      
      this.downloadedCount++;
      const endTime = performance.now();
      console.log(`  Saved: ${filePath} (${Math.round(endTime - startTime)}ms)`);
    } catch (error) {
      console.error(`  Error downloading ${fileInfo.path}:`, error.message);
    }
  }

  /**
   * Check if a directory should be explored based on filtering rules
   * @param {string} dirPath - Directory path
   * @returns {boolean} - True if directory should be explored
   */
  shouldExploreDirectory(dirPath) {
    // If no include patterns are specified, explore all directories
    if (this.fileFilter.includePatterns.length === 0) {
      return true;
    }
    
    // Check if any include pattern could match files in this directory
    for (const pattern of this.fileFilter.includePatterns) {
      // If pattern starts with the directory path, we should explore it
      if (pattern.startsWith(dirPath + '/') || pattern.startsWith(dirPath)) {
        return true;
      }
      
      // If directory path matches the start of a pattern, we should explore it
      const patternParts = pattern.split('/');
      const dirParts = dirPath.split('/');
      
      let matches = true;
      for (let i = 0; i < Math.min(patternParts.length, dirParts.length); i++) {
        const patternPart = patternParts[i];
        const dirPart = dirParts[i];
        
        // Handle wildcards
        if (patternPart === '**') {
          return true; // ** means we should explore this directory
        }
        if (patternPart.includes('*') || patternPart.includes('?')) {
          // For wildcard patterns, be permissive
          return true;
        }
        if (patternPart !== dirPart) {
          matches = false;
          break;
        }
      }
      
      if (matches) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate local file path for downloaded file
   * @param {string} repoPath - Path of file in repository
   * @returns {string} - Local file path
   */
  generateLocalPath(repoPath) {
    // Remove the subdirectory prefix if present
    let relativePath = repoPath;
    if (this.repoInfo.subdirectory && repoPath.startsWith(this.repoInfo.subdirectory + '/')) {
      relativePath = repoPath.substring(this.repoInfo.subdirectory.length + 1);
    }
    
    // Join with output directory
    return join(this.outputDir, relativePath);
  }
}