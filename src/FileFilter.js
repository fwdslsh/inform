import { minimatch } from 'minimatch';

/**
 * File filtering system with include/exclude glob patterns
 */
export class FileFilter {
  constructor(options = {}) {
    this.includePatterns = options.include || [];
    this.excludePatterns = options.exclude || [];
    
    // Ensure patterns are arrays
    if (typeof this.includePatterns === 'string') {
      this.includePatterns = [this.includePatterns];
    }
    if (typeof this.excludePatterns === 'string') {
      this.excludePatterns = [this.excludePatterns];
    }
  }

  /**
   * Check if a file path should be included based on filtering rules
   * @param {string} filePath - The file path to check
   * @returns {boolean} - True if the file should be included
   */
  shouldInclude(filePath) {
    // Normalize path separators to forward slashes
    const normalizedPath = filePath.replace(/\\/g, '/');
    
    // If there are exclude patterns, check if file matches any of them
    if (this.excludePatterns.length > 0) {
      for (const pattern of this.excludePatterns) {
        if (minimatch(normalizedPath, pattern, { matchBase: true })) {
          return false;
        }
      }
    }
    
    // If there are include patterns, file must match at least one
    if (this.includePatterns.length > 0) {
      for (const pattern of this.includePatterns) {
        if (minimatch(normalizedPath, pattern, { matchBase: true })) {
          return true;
        }
      }
      return false; // No include patterns matched
    }
    
    // No include patterns specified, and not excluded, so include it
    return true;
  }

  /**
   * Filter an array of file paths
   * @param {string[]} filePaths - Array of file paths
   * @returns {string[]} - Filtered array of file paths
   */
  filterPaths(filePaths) {
    return filePaths.filter(path => this.shouldInclude(path));
  }

  /**
   * Check if URL path should be crawled (for web mode)
   * @param {string} url - The URL to check
   * @returns {boolean} - True if the URL should be crawled
   */
  shouldCrawlUrl(url) {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname;
      
      // Remove leading slash and convert to relative path
      const relativePath = path.startsWith('/') ? path.substring(1) : path;
      
      // For URLs, if no specific path, consider it as the root
      if (!relativePath || relativePath === '') {
        return this.shouldInclude('index.html');
      }
      
      return this.shouldInclude(relativePath);
    } catch (error) {
      return true; // If URL parsing fails, default to including
    }
  }

  /**
   * Get a summary of current filter settings
   * @returns {object} - Summary of filter settings
   */
  getSummary() {
    return {
      includePatterns: this.includePatterns,
      excludePatterns: this.excludePatterns,
      hasFilters: this.includePatterns.length > 0 || this.excludePatterns.length > 0
    };
  }
}