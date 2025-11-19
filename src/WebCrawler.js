import { mkdir } from 'fs/promises';
import { dirname, join, basename } from 'path';
import TurndownService from 'turndown';
import { FileFilter } from './FileFilter.js';

export class WebCrawler {
  constructor(baseUrl, options = {}) {
    this.baseUrl = new URL(baseUrl);
    this.visited = new Set();
    this.toVisit = new Set([baseUrl]);
    this.maxPages = options.maxPages || 100;
    this.delay = options.delay || 1000; // Default delay of 1000ms
    this.outputDir = options.outputDir || 'crawled-pages';
    this.concurrency = options.concurrency || 3;
    this.raw = options.raw || false; // New option for raw mode
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

  async crawl() {
    console.log(`Starting crawl from: ${this.baseUrl.href}`);
    console.log(`Output directory: ${this.outputDir}`);
    console.log(`Concurrency: ${this.concurrency}`);
    
    const filterSummary = this.fileFilter.getSummary();
    if (filterSummary.hasFilters) {
      console.log(`Include patterns: ${filterSummary.includePatterns.join(', ') || 'none'}`);
      console.log(`Exclude patterns: ${filterSummary.excludePatterns.join(', ') || 'none'}`);
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
          })
          .catch(error => {
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
    const links = [];
    let foundMainSelector = false;
    
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
      // Extract links
      .on('a', {
        element(element) {
          const href = element.getAttribute('href');
          if (href && isInMainContent && !isInUnwantedElement) {
            links.push(href);
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

  processFoundLink(href, currentUrl) {
    try {
      if (!href) return;
      const absoluteUrl = new URL(href, currentUrl).href;
      const urlObj = new URL(absoluteUrl);
      if (urlObj.hostname === this.baseUrl.hostname && 
          !this.visited.has(absoluteUrl) && 
          !this.toVisit.has(absoluteUrl)) {
        const path = urlObj.pathname.toLowerCase();
        if (this.shouldSkipFile(path)) return;
        
        // Apply file filtering to URLs
        if (!this.fileFilter.shouldCrawlUrl(absoluteUrl)) {
          return;
        }
        
        this.toVisit.add(absoluteUrl);
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
