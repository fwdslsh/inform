import { mkdir } from 'fs/promises';
import { dirname, join, basename } from 'path';
import TurndownService from 'turndown';
import { FileFilter } from './FileFilter.js';
import { RobotsParser } from './RobotsParser.js';

export class WebCrawler {
  constructor(baseUrl, options = {}) {
    this.baseUrl = new URL(baseUrl);
    // Store the base path to ensure we only crawl within this path
    // If the path ends with a slash, it's explicitly a directory
    // Otherwise, we extract the directory from the path (go up one level)
    let basePath = this.baseUrl.pathname;
    if (basePath.endsWith('/')) {
      // Remove trailing slash
      basePath = basePath.slice(0, -1);
    } else {
      // Check if this looks like a file (has extension) or a page
      // Extract directory path (go up one level)
      // e.g., /docs/en/sub-agents -> /docs/en
      // e.g., /docs -> /docs (keep it as is for single-level paths)
      const lastSlashIndex = basePath.lastIndexOf('/');
      const segments = basePath.split('/').filter(s => s.length > 0);
      
      // If there are 2+ path segments, go up one level
      // If there's only 1 segment (like /docs), keep it as the base
      if (segments.length > 1) {
        basePath = basePath.substring(0, lastSlashIndex);
      }
    }
    // If basePath is empty, set it to root
    this.basePath = basePath || '/';
    this.visited = new Set();
    this.toVisit = new Set([baseUrl]);
    this.maxPages = options.maxPages || 100;
    this.delay = options.delay || 1000; // Default delay of 1000ms
    this.outputDir = options.outputDir || 'crawled-pages';
    this.concurrency = options.concurrency || 3;
    this.raw = options.raw || false; // New option for raw mode
    this.ignoreErrors = options.ignoreErrors || false; // Exit 0 even with failures
    this.ignoreRobots = options.ignoreRobots || false; // Ignore robots.txt
    this.maxQueueSize = options.maxQueueSize || 10000; // Max URLs in queue
    this.maxRetries = options.maxRetries !== undefined ? options.maxRetries : 3; // Max retry attempts
    this.failures = new Map(); // url -> error message
    this.successes = new Set();
    this.queueLimitWarned = false; // Track if we've warned about queue limit
    this.robotsParser = new RobotsParser('Inform/1.0'); // robots.txt parser
    this.robotsChecked = false; // Track if we've checked robots.txt
    this.fileFilter = new FileFilter({
      include: options.include,
      exclude: options.exclude
    });
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '_'
    });
    this.turndown.addRule('removeScripts', {
      filter: ['script', 'style', 'noscript'],
      replacement: () => ''
    });
    this.turndown.addRule('preCodeBlock', {
      filter: function (node) {
        return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
      },
      replacement: function (content, node) {
        const codeElement = node.firstChild;
        const language = codeElement.className.replace(/.*language-(\w+).*/, '$1') || '';
        const codeContent = codeElement.textContent || codeElement.innerText || '';
        return '\n\n```' + language + '\n' + codeContent + '\n```\n\n';
      }
    });
    this.turndown.addRule('codeElements', {
      filter: function (node) {
        return node.nodeName === 'CODE' && 
               node.parentNode.nodeName !== 'PRE' &&
               (node.textContent.includes('<') || node.textContent.includes('>'));
      },
      replacement: function (content, node) {
        const codeContent = node.textContent || node.innerText || '';
        if (codeContent.includes('\n') || codeContent.length > 50) {
          return '\n\n```html\n' + codeContent + '\n```\n\n';
        }
        return '`' + codeContent + '`';
      }
    });
    this.turndown.addRule('emptyLinks', {
      filter: function (node) {
        return node.nodeName === 'A' && 
               (!node.textContent || node.textContent.trim() === '') &&
               (!node.getAttribute('href') || node.getAttribute('href') === '#');
      },
      replacement: function () {
        return '';
      }
    });
  }

  /**
   * Fetch with retry logic and exponential backoff
   * @param {string} url - URL to fetch
   * @param {object} fetchOptions - Options to pass to fetch
   * @returns {Promise<Response>} - Fetch response
   */
  async fetchWithRetry(url, fetchOptions = {}) {
    const retryableStatus = new Set([429, 500, 502, 503, 504]);

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
          console.log(`  HTTP ${response.status} - Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms`);
          await Bun.sleep(delay);
          continue;
        }

        // Last attempt failed
        return response;
      } catch (error) {
        // Network error (ETIMEDOUT, ECONNRESET, etc.)
        if (attempt < this.maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
          console.log(`  Network error - Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms: ${error.message}`);
          await Bun.sleep(delay);
          continue;
        }

        // Last attempt failed
        throw error;
      }
    }

    throw new Error(`Failed after ${this.maxRetries} retries`);
  }

  async crawl() {
    console.log(`Starting crawl from: ${this.baseUrl.href}`);
    console.log(`Output directory: ${this.outputDir}`);
    console.log(`Concurrency: ${this.concurrency}`);

    const filterSummary = this.fileFilter.getSummary();
    if (filterSummary.hasFilters) {
      console.log(`Include patterns: ${filterSummary.includePatterns.join(', ') || 'none'}`);
      console.log(`Exclude patterns: ${filterSummary.excludePatterns.join(', ') || 'none'}`);
    }

    // Fetch and parse robots.txt
    if (!this.ignoreRobots) {
      console.log('Fetching robots.txt...');
      const rules = await this.robotsParser.fetch(this.baseUrl);
      this.robotsChecked = true;

      if (rules.exists) {
        console.log(`robots.txt found: ${rules.disallowedPaths.length} disallowed paths`);

        // Apply crawl-delay if specified
        const crawlDelay = this.robotsParser.getCrawlDelay(this.baseUrl);
        if (crawlDelay !== null && crawlDelay > this.delay) {
          console.log(`Applying crawl-delay from robots.txt: ${crawlDelay}ms (overriding ${this.delay}ms)`);
          this.delay = crawlDelay;
        }
      } else {
        console.log('No robots.txt found');
      }
    } else {
      console.log('WARNING: Ignoring robots.txt (--ignore-robots flag set)');
    }

    await mkdir(this.outputDir, { recursive: true });
    const activePromises = new Set();
    while (this.toVisit.size > 0 && this.visited.size < this.maxPages) {
      while (activePromises.size < this.concurrency && this.toVisit.size > 0 && this.visited.size < this.maxPages) {
        const currentUrl = Array.from(this.toVisit)[0];
        this.toVisit.delete(currentUrl);
        if (this.visited.has(currentUrl)) continue;
        const promise = this.crawlPage(currentUrl)
          .then(() => {
            this.visited.add(currentUrl);
            this.successes.add(currentUrl);
          })
          .catch(error => {
            this.visited.add(currentUrl);
            this.failures.set(currentUrl, error.message);
            console.error(`Error crawling ${currentUrl}:`, error.message);
          })
          .finally(() => {
            activePromises.delete(promise);
          });
        activePromises.add(promise);
        if (this.delay > 0 && activePromises.size > 1) {
          await Bun.sleep(this.delay / this.concurrency);
        }
      }
      if (activePromises.size > 0) {
        await Promise.race(activePromises);
      }
    }
    await Promise.all(activePromises);

    // Display summary
    this.displaySummary();
  }

  displaySummary() {
    console.log(`\nCrawl complete! Processed ${this.visited.size} pages.`);
    console.log(`Pages saved to: ${this.outputDir}/`);

    console.log('\nSummary:');
    console.log(`  ✓ Successful: ${this.successes.size} pages`);
    console.log(`  ✗ Failed: ${this.failures.size} pages`);

    if (this.failures.size > 0) {
      console.log('\nFailed Pages:');
      for (const [url, error] of this.failures) {
        console.log(`  • ${url} - ${error}`);
      }

      if (!this.ignoreErrors) {
        console.log('\nExiting with error code 1 due to failures (use --ignore-errors to exit with 0)');
        process.exit(1);
      } else {
        console.log('\nIgnoring errors (--ignore-errors flag set)');
      }
    }
  }

  async crawlPage(url) {
    console.log(`Crawling: ${url}`);
    const startTime = performance.now();
    const response = await this.fetchWithRetry(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; WebCrawler/1.0; +Bun)'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      console.log(`  Skipping non-HTML content: ${contentType}`);
      return;
    }
    const html = await response.text();
    
    // Extract content using HTMLRewriter (Bun's native streaming HTML parser)
    const extractedContent = await this.extractContentWithHTMLRewriter(html, url);
    
    let content;
    if (this.raw) {
      content = extractedContent.html; // Keep raw HTML
    } else {
      let markdown = this.turndown.turndown(extractedContent.html);
      content = this.cleanupMarkdown(markdown);
    }
    
    const relativePath = this.generateFilepath(url);
    const filepath = join(this.outputDir, relativePath.replace(/\\/g, '/'));
    await mkdir(dirname(filepath), { recursive: true });
    await Bun.write(filepath, content);
    const endTime = performance.now();
    console.log(`  Saved: ${relativePath} (${Math.round(endTime - startTime)}ms)`);
    
    // Find links from the extracted links
    for (const link of extractedContent.links) {
      this.processFoundLink(link, url);
    }
  }

  async extractContentWithHTMLRewriter(html, currentUrl) {
    let mainContent = '';
    let isInMainContent = false;
    let isInUnwantedElement = false;
    let unwantedDepth = 0;
    let mainContentDepth = 0;
    let foundMainSelector = false;
    
    // Extract links using regex before processing with HTMLRewriter
    // This ensures we capture all links regardless of where they are in the page
    const links = this.extractLinks(html);
    
    const unwantedSelectors = [
      'nav', 'header', 'footer', '.nav', '.navigation', '.menu', '.sidebar', 
      '.advertisement', '.ad', '.social', '.share', '.comments', '.related', 
      '.breadcrumb', 'script', 'style', 'noscript', '.cookie-notice', '.popup', 
      '.modal', '.overlay'
    ];
    
    const mainSelectors = [
      'main', '[role="main"]', '.main-content', '.content', '.post-content', 
      '.entry-content', '.article-content', 'article', '.documentation', 
      '.docs-content'
    ];

    const rewriter = new HTMLRewriter()
      // Handle main content selectors
      .on('main', {
        element(element) {
          if (!foundMainSelector) {
            isInMainContent = true;
            foundMainSelector = true;
            mainContentDepth = 1;
          }
        }
      })
      .on('[role="main"]', {
        element(element) {
          if (!foundMainSelector) {
            isInMainContent = true;
            foundMainSelector = true;
            mainContentDepth = 1;
          }
        }
      })
      .on('.main-content, .content, .post-content, .entry-content, .article-content, article, .documentation, .docs-content', {
        element(element) {
          if (!foundMainSelector) {
            isInMainContent = true;
            foundMainSelector = true;
            mainContentDepth = 1;
          }
        }
      })
      // Handle body if no main content found
      .on('body', {
        element(element) {
          if (!foundMainSelector) {
            isInMainContent = true;
            mainContentDepth = 1;
          }
        }
      })
      // Handle unwanted elements
      .on('nav, header, footer, .nav, .navigation, .menu, .sidebar, .advertisement, .ad, .social, .share, .comments, .related, .breadcrumb, script, style, noscript, .cookie-notice, .popup, .modal, .overlay', {
        element(element) {
          if (isInMainContent && !element.getAttribute('class')?.includes('code')) {
            isInUnwantedElement = true;
            unwantedDepth = 1;
            element.remove();
          }
        }
      })
      // Preserve code elements
      .on('code, pre, .highlight, .language-, [class*="highlight"], [class*="language"]', {
        element(element) {
          element.setAttribute('data-preserve', 'true');
          if (element.tagName === 'code' && element.innerHTML?.includes('<')) {
            element.setAttribute('data-contains-html', 'true');
          }
        }
      })
      // Handle all other elements for content extraction
      .on('*', {
        element(element) {
          if (isInMainContent && !isInUnwantedElement) {
            // Track depth for proper nesting
            if (isInMainContent) mainContentDepth++;
            if (isInUnwantedElement) unwantedDepth++;
          }
        },
        text(text) {
          if (isInMainContent && !isInUnwantedElement) {
            mainContent += text.text;
          }
        }
      });

    // Process the HTML
    const response = new Response(html);
    const transformedResponse = rewriter.transform(response);
    const transformedHtml = await transformedResponse.text();
    
    return {
      html: foundMainSelector ? transformedHtml : html,
      links
    };
  }

  extractLinks(html) {
    const links = [];
    // Match all <a> tags with href attributes
    // This regex captures href values from anchor tags, handling both single and double quotes
    const hrefRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = hrefRegex.exec(html)) !== null) {
      const href = match[1];
      if (href && !href.startsWith('#')) {
        // Decode HTML entities in the URL
        const decodedHref = href
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        links.push(decodedHref);
      }
    }
    
    return links;
  }

  processFoundLink(href, currentUrl) {
    try {
      if (!href) return;
      const absoluteUrl = new URL(href, currentUrl).href;
      const urlObj = new URL(absoluteUrl);
      
      // Remove hash fragment to treat URLs with different hashes as the same page
      urlObj.hash = '';
      const normalizedUrl = urlObj.href;
      
      // Check if the URL is on the same hostname and within the base path
      if (urlObj.hostname === this.baseUrl.hostname && 
          !this.visited.has(normalizedUrl) && 
          !this.toVisit.has(normalizedUrl)) {
        
        // Ensure the URL is within the base path
        const urlPath = urlObj.pathname;
        // Check if the URL path starts with base path or equals it
        // For base path /docs, accept /docs, /docs/, /docs/xyz but not /documentation
        if (this.basePath !== '/' && 
            urlPath !== this.basePath && 
            !urlPath.startsWith(this.basePath + '/')) {
          return;
        }
        
        const path = urlObj.pathname.toLowerCase();
        if (this.shouldSkipFile(path)) return;

        // Apply file filtering to URLs
        if (!this.fileFilter.shouldCrawlUrl(normalizedUrl)) {
          return;
        }

        // Check robots.txt
        if (!this.ignoreRobots && this.robotsChecked) {
          if (!this.robotsParser.isAllowed(absoluteUrl)) {
            console.log(`  Blocked by robots.txt: ${absoluteUrl}`);
            return;
          }
        }

        // Check queue size limit
        if (this.toVisit.size >= this.maxQueueSize) {
          if (!this.queueLimitWarned) {
            console.warn(`\nWarning: Queue size limit reached (${this.maxQueueSize} URLs). Skipping new links.`);
            console.warn(`Increase limit with --max-queue-size or reduce --max-pages to crawl fewer pages.`);
            this.queueLimitWarned = true;
          }
          return;
        }

        this.toVisit.add(absoluteUrl);

        // Periodic queue size logging (every 1000 URLs)
        if (this.toVisit.size % 1000 === 0) {
          console.log(`Queue size: ${this.toVisit.size} URLs pending`);
        }
      }
    } catch (error) {
      // Invalid URL, skip
    }
  }

  cleanupMarkdown(markdown) {
    markdown = markdown.replace(/\[\]\([^)]*\)/g, '');
    markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
    markdown = markdown.replace(/\n\n```/g, '\n```');
    markdown = markdown.replace(/```\n\n/g, '```\n');
    markdown = markdown.replace(/[ \t]+$/gm, '');
    markdown = markdown.replace(/^(#+\s+.+)$/gm, '\n$1\n');
    markdown = markdown.replace(/\n\n\n(#+\s+)/g, '\n\n$1');
    return markdown.trim();
  }

  shouldSkipFile(path) {
    const skipExtensions = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.mp4', '.avi', '.mov', '.mp3', '.wav', '.zip', '.tar', '.gz', '.exe', '.dmg', '.css', '.js', '.xml', '.json'
    ];
    return skipExtensions.some(ext => path.endsWith(ext));
  }

  generateFilepath(url) {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    if (path === '/' || path === '') {
      return this.raw ? 'index.html' : 'index.md';
    }
    path = path.replace(/\/$/, '');
    const pathParts = path.split('/').filter(part => part.length > 0);
    let filename, directory;
    if (pathParts.length === 0) {
      filename = this.raw ? 'index.html' : 'index.md';
      directory = '';
    } else {
      filename = pathParts[pathParts.length - 1];
      directory = pathParts.slice(0, -1).join('/');
      if (urlObj.search) {
        const params = urlObj.search.replace('?', '').replace(/[&=]/g, '_');
        filename += '_' + params;
      }
      filename = filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
      filename += this.raw ? '.html' : '.md';
    }
    const fullPath = directory ? `${directory}/${filename}` : filename;
    return fullPath;
  }

  sleep(ms) {
    return Bun.sleep(ms);
  }
}
