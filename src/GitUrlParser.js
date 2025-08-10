/**
 * Utility for detecting and parsing Git repository URLs
 */
export class GitUrlParser {
  /**
   * Detect if a URL is a Git repository URL
   * @param {string} url - The URL to check
   * @returns {boolean} - True if it's a Git repository URL
   */
  static isGitUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Check for GitHub URLs
      if (urlObj.hostname === 'github.com') {
        // Should have at least owner/repo in path
        const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
        return pathParts.length >= 2;
      }
      
      // Could add support for other Git hosting services here
      // gitlab.com, bitbucket.org, etc.
      
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse a Git URL to extract repository information
   * @param {string} url - The Git repository URL
   * @returns {object} - Parsed repository information
   */
  static parseGitUrl(url) {
    if (!this.isGitUrl(url)) {
      throw new Error('Not a valid Git repository URL');
    }

    const urlObj = new URL(url);
    
    if (urlObj.hostname === 'github.com') {
      return this.parseGitHubUrl(urlObj);
    }
    
    throw new Error('Unsupported Git hosting service');
  }

  /**
   * Parse a GitHub URL to extract owner, repo, branch/ref, and subdirectory
   * @param {URL} urlObj - Parsed URL object
   * @returns {object} - Parsed GitHub repository information
   */
  static parseGitHubUrl(urlObj) {
    const pathParts = urlObj.pathname.split('/').filter(part => part.length > 0);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid GitHub URL: missing owner or repository');
    }

    const result = {
      host: 'github.com',
      owner: pathParts[0],
      repo: pathParts[1],
      branch: 'main', // default branch
      subdirectory: '',
      apiUrl: 'https://api.github.com'
    };

    // Handle different GitHub URL patterns:
    // https://github.com/owner/repo
    // https://github.com/owner/repo/tree/branch
    // https://github.com/owner/repo/tree/branch/path/to/folder
    // https://github.com/owner/repo/blob/branch/path/to/file
    
    if (pathParts.length > 2) {
      if (pathParts[2] === 'tree' || pathParts[2] === 'blob') {
        if (pathParts.length > 3) {
          result.branch = pathParts[3];
          
          // Extract subdirectory path if present
          if (pathParts.length > 4) {
            result.subdirectory = pathParts.slice(4).join('/');
          }
        }
      } else {
        // Direct path without tree/blob - treat as subdirectory on default branch
        result.subdirectory = pathParts.slice(2).join('/');
      }
    }

    // Check for branch in URL fragment or query parameters
    if (urlObj.hash) {
      // Handle fragments like #branch-name
      const hash = urlObj.hash.substring(1);
      if (hash && !hash.includes('/')) {
        result.branch = hash;
      }
    }

    // Handle query parameters like ?ref=branch-name
    const searchParams = new URLSearchParams(urlObj.search);
    if (searchParams.has('ref')) {
      result.branch = searchParams.get('ref');
    }

    return result;
  }

  /**
   * Construct GitHub API URL for repository contents
   * @param {object} repoInfo - Repository information from parseGitUrl
   * @param {string} path - Optional path within the repository
   * @returns {string} - GitHub API URL
   */
  static getGitHubApiUrl(repoInfo, path = '') {
    const basePath = repoInfo.subdirectory 
      ? `${repoInfo.subdirectory}${path ? '/' + path : ''}`
      : path;
    
    const apiPath = basePath ? `/${basePath}` : '';
    
    return `${repoInfo.apiUrl}/repos/${repoInfo.owner}/${repoInfo.repo}/contents${apiPath}?ref=${repoInfo.branch}`;
  }
}