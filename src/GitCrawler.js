import { mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { GitUrlParser } from './GitUrlParser.js';
import { FileFilter } from './FileFilter.js';

/**
 * Git repository crawler for downloading files from Git repositories
 * Supports GitHub API authentication, file filtering, retry logic, and error handling
 */
export class GitCrawler {
  /**
   * Create a new GitCrawler instance
   * @param {string} gitUrl - GitHub repository URL (supports various formats)
   * @param {object} options - Configuration options
   * @param {string} [options.outputDir='crawled-pages'] - Output directory for downloaded files
   * @param {boolean} [options.ignoreErrors=false] - Exit with code 0 even if failures occur
   * @param {number} [options.maxRetries=3] - Maximum retry attempts for failed requests
   * @param {string} [options.logLevel='normal'] - Logging level: 'quiet', 'normal', or 'verbose'
   * @param {string[]} [options.include] - Glob patterns for files to include
   * @param {string[]} [options.exclude] - Glob patterns for files to exclude
   * @param {number} [options.delay=2000] - Delay between GitHub API requests in milliseconds
   */
  constructor(gitUrl, options = {}) {
    this.repoInfo = GitUrlParser.parseGitUrl(gitUrl);
    this.outputDir = options.outputDir || 'crawled-pages';
    this.ignoreErrors = options.ignoreErrors || false; // Exit 0 even with failures
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3; // Max retry attempts
    this.logLevel = options.logLevel || 'normal'; // Logging level
    this.delay = options.delay !== undefined ? options.delay : 2000; // Default 2s delay for GitHub API
    this.fileFilter = new FileFilter({
      include: options.include,
      exclude: options.exclude
    });
    this.processedFiles = new Set();
    this.downloadedCount = 0;
    this.failures = new Map(); // file path -> error message
    this.lastRequestTime = 0; // Track last request time for rate limiting

    // GitHub API token authentication (optional)
    this.githubToken = process.env.GITHUB_TOKEN || null;
    if (this.githubToken) {
      this.log('Using GitHub API token for authentication');
    }
    
    // Log delay setting for GitHub rate limiting
    if (this.delay > 0) {
      this.log(`GitHub API delay: ${this.delay}ms between requests to prevent rate limiting`);
    }
  }

  /**
   * Log message at normal or verbose level
   * @param {string} message - Message to log
   */
  log(message) {
    if (this.logLevel !== 'quiet') {
      console.log(message);
    }
  }

  /**
   * Log message only at verbose level
   * @param {string} message - Message to log
   */
  logVerbose(message) {
    if (this.logLevel === 'verbose') {
      console.log(message);
    }
  }

  /**
   * Log error message (always shown)
   * @param {...any} args - Arguments to pass to console.error
   */
  logError(...args) {
    console.error(...args);
  }

  /**
   * Log warning message (shown at normal and verbose levels)
   * @param {string} message - Message to log
   */
  logWarn(message) {
    if (this.logLevel !== 'quiet') {
      console.warn(message);
    }
  }

  /**
   * Start crawling the Git repository
   */
  async crawl() {
    this.log(`Starting Git repository download...`);
    this.log(`Repository: ${this.repoInfo.owner}/${this.repoInfo.repo}`);
    this.log(`Branch: ${this.repoInfo.branch}`);
    if (this.repoInfo.subdirectory) {
      this.log(`Subdirectory: ${this.repoInfo.subdirectory}`);
    }
    this.log(`Output directory: ${this.outputDir}`);

    const filterSummary = this.fileFilter.getSummary();
    if (filterSummary.hasFilters) {
      this.log(`Include patterns: ${filterSummary.includePatterns.join(', ') || 'none'}`);
      this.log(`Exclude patterns: ${filterSummary.excludePatterns.join(', ') || 'none'}`);
    }
    
    await mkdir(this.outputDir, { recursive: true });
    
    try {
      await this.downloadDirectory('');
      this.displaySummary();
    } catch (error) {
      if (error.message.includes('404')) {
        throw new Error(`Repository not found or not accessible: ${this.repoInfo.owner}/${this.repoInfo.repo}`);
      }
      throw error;
    }
  }

  /**
   * Get HTTP headers for GitHub API requests
   * @returns {object} - Headers object with authentication if available
   */
  getGitHubHeaders() {
    const headers = {
      'User-Agent': 'Inform-GitCrawler/1.0',
      'Accept': 'application/vnd.github.v3+json'
    };

    // Add authorization header if token is available
    if (this.githubToken) {
      headers['Authorization'] = `Bearer ${this.githubToken}`;
    }

    return headers;
  }

  /**
   * Fetch with retry logic and exponential backoff
   * @param {string} url - URL to fetch
   * @param {object} fetchOptions - Options to pass to fetch
   * @returns {Promise<Response>} - Fetch response
   */
  async fetchWithRetry(url, fetchOptions = {}) {
    const retryableStatus = new Set([429, 500, 502, 503, 504]);

    // Apply rate limiting delay between requests
    if (this.delay > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.delay) {
        const waitTime = this.delay - timeSinceLastRequest;
        this.logVerbose(`Rate limiting: waiting ${waitTime}ms before request`);
        await Bun.sleep(waitTime);
      }
      this.lastRequestTime = Date.now();
    }

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        // Success or non-retryable error
        if (response.ok || !retryableStatus.has(response.status)) {
          return response;
        }

        // Server error - retry if we have attempts left
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          this.log(`  HTTP ${response.status} - Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
          await Bun.sleep(delay);
          continue;
        }

        // Last attempt failed
        return response;
      } catch (error) {
        // Network error (ETIMEDOUT, ECONNRESET, etc.)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          this.log(`  Network error - Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms: ${error.message}`);
          await Bun.sleep(delay);
          continue;
        }

        // Last attempt failed
        throw error;
      }
    }

    throw new Error(`Failed after ${this.maxRetries} retries`);
  }

  /**
   * Display summary of download results
   * Returns true if there were failures, false otherwise
   * Note: Does NOT exit the process - caller should handle exit codes
   * @returns {boolean} True if there were failures
   */
  displaySummary() {
    console.log(`\nGit repository download complete!`);
    console.log(`Files saved to: ${this.outputDir}/`);

    console.log('\nSummary:');
    console.log(`  ✓ Successful: ${this.downloadedCount} files`);
    console.log(`  ✗ Failed: ${this.failures.size} files`);

    if (this.failures.size > 0) {
      console.log('\nFailed Files:');
      for (const [filePath, error] of this.failures) {
        console.log(`  • ${filePath} - ${error}`);
      }

      if (!this.ignoreErrors) {
        console.log('\nNote: Download completed with failures (use --ignore-errors to suppress)');
      } else {
        console.log('\nIgnoring errors (--ignore-errors flag set)');
      }
      return true; // Has failures
    }
    return false; // No failures
  }

  /**
   * Download files from a directory in the repository
   * @param {string} path - Directory path within the repository
   */
  async downloadDirectory(path) {
    const apiUrl = GitUrlParser.getGitHubApiUrl(this.repoInfo, path);

    try {
      const response = await this.fetchWithRetry(apiUrl, {
        headers: this.getGitHubHeaders()
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
      this.logError(`Error downloading directory ${path}:`, error.message);
      throw error;
    }
  }

  /**
   * Download a single file from the repository
   * @param {object} fileInfo - File information from GitHub API
   */
  async downloadFile(fileInfo) {
    const filePath = this.generateLocalPath(fileInfo.path.replace(/\\/g, '/'));
    
    // Skip if already processed
    if (this.processedFiles.has(fileInfo.path)) {
      return;
    }
    this.processedFiles.add(fileInfo.path);

    this.log(`Downloading: ${fileInfo.path}`);
    const startTime = performance.now();

    try {
      // Determine if file is binary based on extension
      const isBinary = this.isBinaryFile(fileInfo.path);
      let content;
      
      if (fileInfo.size <= 1024 * 1024 && fileInfo.content) {
        // File content is available in the API response (base64 encoded)
        if (isBinary) {
          // Keep binary data as Buffer for binary files
          content = Buffer.from(fileInfo.content, 'base64');
        } else {
          // Convert to string only for text files
          content = Buffer.from(fileInfo.content, 'base64').toString('utf8');
        }
      } else {
        // For larger files or when content is not in response, fetch directly
        const response = await this.fetchWithRetry(fileInfo.download_url, {
          headers: this.getGitHubHeaders()
        });
        
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
        }
        
        if (isBinary) {
          // Use arrayBuffer for binary files to preserve data integrity
          const buffer = await response.arrayBuffer();
          content = Buffer.from(buffer);
        } else {
          // Use text for text files
          content = await response.text();
        }
      }

      // Create directory if it doesn't exist
      await mkdir(dirname(filePath), { recursive: true });
      
      // Write file content
      await Bun.write(filePath, content);

      this.downloadedCount++;
      const endTime = performance.now();
      this.log(`  Saved: ${filePath} (${Math.round(endTime - startTime)}ms)`);
    } catch (error) {
      this.failures.set(fileInfo.path, error.message);
      this.logError(`  Error downloading ${fileInfo.path}:`, error.message);
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
      const dirParts = dirPath.replace(/\\/g, '/').split('/');
      
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
   * Check if a file is binary based on its extension
   * @param {string} filePath - File path
   * @returns {boolean} - True if file is binary
   */
  isBinaryFile(filePath) {
    const binaryExtensions = [
      // Images
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg', '.webp', '.avif',
      // Documents
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
      // Archives
      '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar', '.xz',
      // Executables
      '.exe', '.dll', '.so', '.dylib', '.bin', '.app',
      // Media
      '.mp3', '.mp4', '.avi', '.mkv', '.mov', '.wav', '.flac', '.ogg', '.webm',
      // Fonts
      '.ttf', '.otf', '.woff', '.woff2', '.eot',
      // Data
      '.db', '.sqlite', '.dat', '.cache',
      // Other binary formats
      '.class', '.jar', '.war', '.ear', '.pyc', '.pyo', '.wasm'
    ];
    
    const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
    return binaryExtensions.includes(ext);
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
    // Join with output directory and normalize to forward slashes
    const localPath = join(this.outputDir, relativePath);
    return localPath.replace(/\\/g, '/');
  }
}