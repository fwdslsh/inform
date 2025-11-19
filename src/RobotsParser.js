/**
 * Parser for robots.txt files
 * Implements robots exclusion protocol: https://www.robotstxt.org/
 */
export class RobotsParser {
  /**
   * Create a new RobotsParser instance
   * @param {string} [userAgent='Inform/1.0'] - User agent string to match against robots.txt rules
   */
  constructor(userAgent = 'Inform/1.0') {
    this.userAgent = userAgent;
    this.cache = new Map(); // Cache per domain: domain -> rules
  }

  /**
   * Fetch and parse robots.txt for a given base URL
   * @param {URL} baseUrl - Base URL of the site
   * @returns {Promise<object>} - Parsed rules
   */
  async fetch(baseUrl) {
    const domain = baseUrl.origin;

    // Return cached rules if available
    if (this.cache.has(domain)) {
      return this.cache.get(domain);
    }

    const robotsUrl = new URL('/robots.txt', baseUrl);

    try {
      const response = await fetch(robotsUrl.href, {
        headers: {
          'User-Agent': this.userAgent
        }
      });

      if (!response.ok) {
        // No robots.txt or error - allow everything
        const rules = {
          disallowedPaths: [],
          crawlDelay: null,
          exists: false
        };
        this.cache.set(domain, rules);
        return rules;
      }

      const text = await response.text();
      const rules = this.parse(text);
      rules.exists = true;
      this.cache.set(domain, rules);
      return rules;
    } catch (error) {
      // Network error - allow everything but log warning
      console.warn(`Warning: Could not fetch robots.txt from ${robotsUrl.href}: ${error.message}`);
      const rules = {
        disallowedPaths: [],
        crawlDelay: null,
        exists: false
      };
      this.cache.set(domain, rules);
      return rules;
    }
  }

  /**
   * Parse robots.txt content
   * @param {string} text - robots.txt content
   * @returns {object} - Parsed rules
   */
  parse(text) {
    const lines = text.split('\n');
    const rules = {
      disallowedPaths: [],
      crawlDelay: null
    };

    let currentUserAgent = null;
    let isRelevant = false;

    for (let line of lines) {
      // Remove comments and trim
      line = line.split('#')[0].trim();
      if (!line) continue;

      const [directive, ...valueParts] = line.split(':');
      const value = valueParts.join(':').trim();

      const directiveLower = directive.toLowerCase().trim();

      if (directiveLower === 'user-agent') {
        currentUserAgent = value.toLowerCase();
        // Check if this user-agent applies to us
        isRelevant = this.matchesUserAgent(currentUserAgent);
      } else if (isRelevant) {
        if (directiveLower === 'disallow') {
          if (value) {
            rules.disallowedPaths.push(value);
          }
        } else if (directiveLower === 'crawl-delay') {
          const delay = parseFloat(value);
          if (!isNaN(delay) && delay > 0) {
            // Store in milliseconds
            rules.crawlDelay = delay * 1000;
          }
        }
      }
    }

    return rules;
  }

  /**
   * Check if a user-agent pattern matches our user agent
   * @param {string} pattern - User-agent pattern from robots.txt
   * @returns {boolean} - True if pattern matches
   */
  matchesUserAgent(pattern) {
    // * matches everything
    if (pattern === '*') return true;

    // Exact match or prefix match
    const ourAgent = this.userAgent.toLowerCase();
    return ourAgent.includes(pattern) || ourAgent.startsWith(pattern);
  }

  /**
   * Check if a URL is allowed by robots.txt
   * @param {string} url - URL to check
   * @returns {boolean} - True if allowed
   */
  isAllowed(url) {
    const urlObj = new URL(url);
    const domain = urlObj.origin;

    // If no rules cached, allow (should fetch first)
    if (!this.cache.has(domain)) {
      return true;
    }

    const rules = this.cache.get(domain);
    const path = urlObj.pathname + urlObj.search;

    // Check each disallowed path
    for (const disallowedPath of rules.disallowedPaths) {
      if (this.pathMatches(path, disallowedPath)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a path matches a disallow pattern
   * @param {string} path - URL path to check
   * @param {string} pattern - Disallow pattern
   * @returns {boolean} - True if path matches pattern
   */
  pathMatches(path, pattern) {
    // Empty pattern disallows nothing
    if (!pattern) return false;

    // Simple prefix match (most common case)
    if (!pattern.includes('*') && !pattern.includes('$')) {
      return path.startsWith(pattern);
    }

    // Convert robots.txt pattern to regex
    let regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\*/g, '.*') // * matches anything
      .replace(/\$$/g, '$'); // $ at end means exact match

    // Add ^ for start of string
    if (!regexPattern.startsWith('^')) {
      regexPattern = '^' + regexPattern;
    }

    const regex = new RegExp(regexPattern);
    return regex.test(path);
  }

  /**
   * Get crawl delay for a domain
   * @param {URL} baseUrl - Base URL
   * @returns {number|null} - Crawl delay in milliseconds, or null
   */
  getCrawlDelay(baseUrl) {
    const domain = baseUrl.origin;
    const rules = this.cache.get(domain);
    return rules ? rules.crawlDelay : null;
  }

  /**
   * Check if robots.txt exists for a domain
   * @param {URL} baseUrl - Base URL
   * @returns {boolean} - True if robots.txt exists
   */
  hasRobotsTxt(baseUrl) {
    const domain = baseUrl.origin;
    const rules = this.cache.get(domain);
    return rules ? rules.exists : false;
  }

  /**
   * Clear cache for a specific domain or all domains
   * @param {string} [domain] - Optional domain to clear
   */
  clearCache(domain = null) {
    if (domain) {
      this.cache.delete(domain);
    } else {
      this.cache.clear();
    }
  }
}
