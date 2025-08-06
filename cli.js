#!/usr/bin/env bun

import { mkdir } from 'fs/promises';
import { dirname, join, basename } from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';

class WebCrawler {
  constructor(baseUrl, options = {}) {
    this.baseUrl = new URL(baseUrl);
    this.visited = new Set();
    this.toVisit = new Set([baseUrl]);
    this.maxPages = options.maxPages || 100;
    this.delay = options.delay || 1000;
    this.outputDir = options.outputDir || 'crawled-pages';
    this.concurrency = options.concurrency || 3; // Bun handles concurrency well
    
    // Initialize Turndown service for HTML to Markdown conversion
    this.turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      emDelimiter: '_'
    });
    
    // Configure Turndown to preserve important elements and handle code blocks
    this.turndown.addRule('removeScripts', {
      filter: ['script', 'style', 'noscript'],
      replacement: () => ''
    });
    
    // Better handling for pre+code blocks
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
    
    // Handle standalone code elements that might contain HTML examples
    this.turndown.addRule('codeElements', {
      filter: function (node) {
        return node.nodeName === 'CODE' && 
               node.parentNode.nodeName !== 'PRE' &&
               (node.textContent.includes('<') || node.textContent.includes('>'));
      },
      replacement: function (content, node) {
        const codeContent = node.textContent || node.innerText || '';
        // If it looks like HTML and is multi-line or complex, make it a code block
        if (codeContent.includes('\n') || codeContent.length > 50) {
          return '\n\n```html\n' + codeContent + '\n```\n\n';
        }
        return '`' + codeContent + '`';
      }
    });
    
    // Remove empty or placeholder links
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

  async crawl() {
    console.log(`Starting crawl from: ${this.baseUrl.href}`);
    console.log(`Output directory: ${this.outputDir}`);
    console.log(`Concurrency: ${this.concurrency}`);
    
    // Create output directory
    await mkdir(this.outputDir, { recursive: true });
    
    const activePromises = new Set();
    
    while (this.toVisit.size > 0 && this.visited.size < this.maxPages) {
      // Fill up to concurrency limit
      while (activePromises.size < this.concurrency && this.toVisit.size > 0 && this.visited.size < this.maxPages) {
        const currentUrl = Array.from(this.toVisit)[0];
        this.toVisit.delete(currentUrl);
        
        if (this.visited.has(currentUrl)) continue;
        
        const promise = this.crawlPage(currentUrl)
          .then(() => {
            this.visited.add(currentUrl);
          })
          .catch(error => {
            console.error(`Error crawling ${currentUrl}:`, error.message);
          })
          .finally(() => {
            activePromises.delete(promise);
          });
        
        activePromises.add(promise);
        
        // Respect rate limiting with staggered starts
        if (this.delay > 0 && activePromises.size > 1) {
          await Bun.sleep(this.delay / this.concurrency);
        }
      }
      
      // Wait for at least one promise to complete
      if (activePromises.size > 0) {
        await Promise.race(activePromises);
      }
    }
    
    // Wait for all remaining promises to complete
    await Promise.all(activePromises);
    
    console.log(`\nCrawl complete! Processed ${this.visited.size} pages.`);
    console.log(`Pages saved to: ${this.outputDir}/`);
  }

  async crawlPage(url) {
    console.log(`Crawling: ${url}`);
    
    const startTime = performance.now();
    const response = await fetch(url, {
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
    const parseTime = performance.now();
    
    const dom = new JSDOM(html, { url });
    const document = dom.window.document;
    
    // Extract main content
    const mainContent = this.extractMainContent(document);
    
    // Convert to markdown
    let markdown = this.turndown.turndown(mainContent);
    
    // Post-process the markdown to clean it up
    markdown = this.cleanupMarkdown(markdown);
    
    // Generate filepath with directory structure
    const relativePath = this.generateFilepath(url);
    const filepath = join(this.outputDir, relativePath);
    
    // Create directory structure if it doesn't exist
    await mkdir(dirname(filepath), { recursive: true });
    
    // Save to file using Bun's optimized file writer
    await Bun.write(filepath, markdown);
    
    const endTime = performance.now();
    console.log(`  Saved: ${relativePath} (${Math.round(endTime - startTime)}ms)`);
    
    // Find and queue new URLs
    this.findLinks(document, url);
  }

  extractMainContent(document) {
    // Try to find main content using common selectors
    const selectors = [
      'main',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      'article',
      '.documentation',
      '.docs-content',
      '.container .row .col',
      'body'
    ];
    
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        // Make a copy to avoid modifying the original
        const contentClone = element.cloneNode(true);
        
        // Remove unwanted elements
        this.removeUnwantedElements(contentClone);
        
        // Preserve code blocks by making sure they're properly formatted
        this.preserveCodeBlocks(contentClone);
        
        return contentClone.innerHTML;
      }
    }
    
    // Fallback to body content
    const body = document.body.cloneNode(true);
    this.removeUnwantedElements(body);
    this.preserveCodeBlocks(body);
    return body.innerHTML;
  }

  preserveCodeBlocks(container) {
    // Find all code elements and ensure they're preserved
    const codeElements = container.querySelectorAll('code, pre, .highlight, .code, .language-, [class*="highlight"], [class*="language"]');
    
    codeElements.forEach(el => {
      // Add a data attribute to mark as important
      el.setAttribute('data-preserve', 'true');
      
      // If it's a code element with HTML-like content, ensure it's treated specially
      if (el.nodeName === 'CODE' && el.textContent.match(/<[^>]+>/)) {
        el.setAttribute('data-contains-html', 'true');
      }
    });
    
    // Also look for elements that commonly contain code examples
    const codeContainers = container.querySelectorAll('.example, .demo, .sample, [class*="code"], [class*="highlight"]');
    codeContainers.forEach(el => {
      el.setAttribute('data-preserve', 'true');
    });
  }

  cleanupMarkdown(markdown) {
    // Remove empty links
    markdown = markdown.replace(/\[\]\([^)]*\)/g, '');
    
    // Remove excessive whitespace
    markdown = markdown.replace(/\n\s*\n\s*\n/g, '\n\n');
    
    // Clean up code blocks - remove extra newlines around them
    markdown = markdown.replace(/\n\n```/g, '\n```');
    markdown = markdown.replace(/```\n\n/g, '```\n');
    
    // Remove trailing whitespace from lines
    markdown = markdown.replace(/[ \t]+$/gm, '');
    
    // Ensure proper spacing around headers
    markdown = markdown.replace(/^(#+\s+.+)$/gm, '\n$1\n');
    markdown = markdown.replace(/\n\n\n(#+\s+)/g, '\n\n$1');
    
    return markdown.trim();
  }

  removeUnwantedElements(container) {
    const unwantedSelectors = [
      'nav:not(.code-nav)',
      'header:not(.code-header)', 
      'footer:not(.code-footer)',
      '.nav:not(.code-nav)',
      '.navigation:not(.code-navigation)',
      '.menu:not(.code-menu)',
      '.sidebar:not(.main-sidebar)',
      '.advertisement',
      '.ad',
      '.social',
      '.share',
      '.comments',
      '.related:not(.code-related)',
      '.breadcrumb',
      'script',
      'style',
      'noscript',
      '.cookie-notice',
      '.popup',
      '.modal:not(.code-modal)',
      '.overlay:not(.code-overlay)'
    ];
    
    unwantedSelectors.forEach(selector => {
      const elements = container.querySelectorAll(selector);
      elements.forEach(el => {
        // Double-check that we're not removing code-containing elements
        if (!el.querySelector('code, pre, .highlight, .language-, .hljs')) {
          el.remove();
        }
      });
    });
  }

  findLinks(document, currentUrl) {
    const links = document.querySelectorAll('a[href]');
    
    for (const link of links) {
      try {
        const href = link.getAttribute('href');
        if (!href) continue;
        
        const absoluteUrl = new URL(href, currentUrl).href;
        const urlObj = new URL(absoluteUrl);
        
        // Only crawl URLs from the same domain
        if (urlObj.hostname === this.baseUrl.hostname && 
            !this.visited.has(absoluteUrl) && 
            !this.toVisit.has(absoluteUrl)) {
          
          // Skip non-HTML files
          const path = urlObj.pathname.toLowerCase();
          if (this.shouldSkipFile(path)) continue;
          
          this.toVisit.add(absoluteUrl);
        }
      } catch (error) {
        // Invalid URL, skip
        continue;
      }
    }
  }

  shouldSkipFile(path) {
    const skipExtensions = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp',
      '.mp4', '.avi', '.mov', '.mp3', '.wav',
      '.zip', '.tar', '.gz', '.exe', '.dmg',
      '.css', '.js', '.xml', '.json'
    ];
    
    return skipExtensions.some(ext => path.endsWith(ext));
  }

  generateFilepath(url) {
    const urlObj = new URL(url);
    let path = urlObj.pathname;
    
    // Handle root path
    if (path === '/' || path === '') {
      return 'index.md';
    }
    
    // Remove trailing slash
    path = path.replace(/\/$/, '');
    
    // Split path into directory and filename parts
    const pathParts = path.split('/').filter(part => part.length > 0);
    
    let filename, directory;
    
    if (pathParts.length === 0) {
      filename = 'index.md';
      directory = '';
    } else {
      // Use the last part as filename, rest as directory structure
      filename = pathParts[pathParts.length - 1];
      directory = pathParts.slice(0, -1).join('/');
      
      // Add query params to filename if they exist
      if (urlObj.search) {
        const params = urlObj.search.replace('?', '').replace(/[&=]/g, '_');
        filename += '_' + params;
      }
      
      // Sanitize filename
      filename = filename.replace(/[<>:"/\\|?*]/g, '_').substring(0, 200);
      filename += '.md';
    }
    
    // Combine directory and filename
    const fullPath = directory ? join(directory, filename) : filename;
    
    return fullPath;
  }

  sleep(ms) {
    return Bun.sleep(ms);
  }
}

function showHelp() {
  console.log(`
Web Crawler - Download and convert web pages to Markdown (Optimized with Bun)

Usage:
  bun cli.js <base-url> [options]

Arguments:
  base-url    The starting URL to crawl from

Options:
  --max-pages <number>    Maximum number of pages to crawl (default: 100)
  --delay <ms>           Delay between requests in milliseconds (default: 1000)
  --output-dir <path>    Output directory for saved files (default: crawled-pages)
  --concurrency <number>  Number of concurrent requests (default: 3)
  --help                 Show this help message

Examples:
  bun cli.js https://example.com
  bun cli.js https://docs.example.com --max-pages 50 --delay 500 --concurrency 5
  bun cli.js https://blog.example.com --output-dir ./blog-content

Notes:
  - Uses Bun's optimized fetch and file I/O for better performance
  - Supports concurrent crawling for faster processing
  - Maintains original folder structure (e.g., /docs/api becomes docs/api.md)
  - Converts HTML code examples to markdown code blocks
  - Stays within the same domain as the base URL
`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  const baseUrl = args[0];
  
  // Validate URL
  try {
    new URL(baseUrl);
  } catch (error) {
    console.error('Error: Invalid URL provided');
    console.error('Please provide a valid URL starting with http:// or https://');
    process.exit(1);
  }
  
  // Parse options
  const options = {};
  
  for (let i = 1; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];
    
    switch (flag) {
      case '--max-pages':
        options.maxPages = parseInt(value);
        if (isNaN(options.maxPages) || options.maxPages <= 0) {
          console.error('Error: --max-pages must be a positive number');
          process.exit(1);
        }
        break;
      case '--delay':
        options.delay = parseInt(value);
        if (isNaN(options.delay) || options.delay < 0) {
          console.error('Error: --delay must be a non-negative number');
          process.exit(1);
        }
        break;
      case '--output-dir':
        options.outputDir = value;
        break;
      case '--concurrency':
        options.concurrency = parseInt(value);
        if (isNaN(options.concurrency) || options.concurrency <= 0) {
          console.error('Error: --concurrency must be a positive number');
          process.exit(1);
        }
        break;
      default:
        if (flag.startsWith('--')) {
          console.error(`Error: Unknown option ${flag}`);
          process.exit(1);
        }
    }
  }
  
  console.log('🕷️  Web Crawler Starting... (Powered by Bun)\n');
  
  const crawler = new WebCrawler(baseUrl, options);
  
  try {
    await crawler.crawl();
  } catch (error) {
    console.error('\nCrawl failed:', error.message);
    process.exit(1);
  }
}

// Run the crawler
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
