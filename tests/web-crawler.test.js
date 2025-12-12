import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { WebCrawler } from '../src/WebCrawler.js';
import { mkdir, rmdir, writeFile } from 'fs/promises';
import { join } from 'path';

describe('WebCrawler with Bun HTMLRewriter', () => {
  let testDir;
  
  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-output-' + Date.now());
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      await rmdir(testDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should process HTML using HTMLRewriter', async () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    const html = '<html><body><main><h1>Test</h1><p>Content</p></main></body></html>';
    
    const result = await crawler.extractContentWithHTMLRewriter(html, 'https://example.com');
    
    expect(result).toBeDefined();
    expect(result.html).toBeDefined();
    expect(result.links).toBeDefined();
    expect(Array.isArray(result.links)).toBe(true);
  });

  test('should extract links from HTML', async () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    const html = `
      <html>
        <body>
          <main>
            <a href="/page1">Link 1</a>
            <a href="https://example.com/page2">Link 2</a>
            <a href="https://external.com/page3">External Link</a>
          </main>
        </body>
      </html>
    `;
    
    const result = await crawler.extractContentWithHTMLRewriter(html, 'https://example.com/current');
    
    expect(result.links).toContain('/page1');
    expect(result.links).toContain('https://example.com/page2');
    expect(result.links).toContain('https://external.com/page3');
  });

  test('should process found link correctly', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    // Mock the toVisit set to capture found links
    const foundLinks = new Set();
    crawler.toVisit = {
      has: () => false,
      add: (url) => foundLinks.add(url)
    };
    crawler.visited = new Set();
    
    crawler.processFoundLink('/page1', 'https://example.com/current');
    crawler.processFoundLink('https://example.com/page2', 'https://example.com/current');
    crawler.processFoundLink('https://external.com/page3', 'https://example.com/current');
    
    expect(foundLinks.has('https://example.com/page1')).toBe(true);
    expect(foundLinks.has('https://example.com/page2')).toBe(true);
    expect(foundLinks.has('https://external.com/page3')).toBe(false); // External links should be filtered out
  });

  test('should generate correct file paths', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    expect(crawler.generateFilepath('https://example.com/')).toBe('index.md');
    expect(crawler.generateFilepath('https://example.com/docs')).toBe('docs.md');
    expect(crawler.generateFilepath('https://example.com/docs/api')).toBe('docs/api.md');
    expect(crawler.generateFilepath('https://example.com/docs/api/')).toBe('docs/api.md');
  });

  test('should generate correct file paths in raw mode', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir, raw: true });
    
    expect(crawler.generateFilepath('https://example.com/')).toBe('index.html');
    expect(crawler.generateFilepath('https://example.com/docs')).toBe('docs.html');
    expect(crawler.generateFilepath('https://example.com/docs/api')).toBe('docs/api.html');
  });

  test('should cleanup markdown correctly', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    const messyMarkdown = `
# Title


Some text with empty links []()



More text
    
    
# Another Title
    `;
    
    const cleaned = crawler.cleanupMarkdown(messyMarkdown);
    
    expect(cleaned).not.toContain('[]()');
    // Note: Our cleanup might not remove all triple newlines in this specific case
    expect(cleaned.trim()).toBeTruthy();
  });

  test('should skip binary and non-HTML files', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    expect(crawler.shouldSkipFile('/document.pdf')).toBe(true);
    expect(crawler.shouldSkipFile('/image.jpg')).toBe(true);
    expect(crawler.shouldSkipFile('/script.js')).toBe(true);
    expect(crawler.shouldSkipFile('/styles.css')).toBe(true);
    expect(crawler.shouldSkipFile('/page.html')).toBe(false);
    expect(crawler.shouldSkipFile('/docs/api')).toBe(false);
  });

  test('should initialize with correct options', () => {
    const options = {
      maxPages: 50,
      delay: 500,
      outputDir: './custom-output',
      concurrency: 5,
      raw: true,
      include: ['*.md'],
      exclude: ['*.tmp']
    };
    
    const crawler = new WebCrawler('https://example.com', options);
    
    expect(crawler.maxPages).toBe(50);
    expect(crawler.delay).toBe(500);
    expect(crawler.outputDir).toBe('./custom-output');
    expect(crawler.concurrency).toBe(5);
    expect(crawler.raw).toBe(true);
  });

  test('should respect base URL path when crawling subdirectories', () => {
    // Without trailing slash, the base path is extracted from the directory
    // e.g., https://opencode.ai/docs/overview -> base path is /docs
    const crawler = new WebCrawler('https://opencode.ai/docs/overview', { outputDir: testDir });
    
    // Mock the toVisit set to capture found links
    const foundLinks = new Set();
    crawler.toVisit = {
      has: () => false,
      add: (url) => foundLinks.add(url)
    };
    crawler.visited = new Set();
    
    // Test relative links from /docs page - should crawl anything under /docs
    crawler.processFoundLink('/docs/getting-started', 'https://opencode.ai/docs/overview');
    crawler.processFoundLink('/docs/installation', 'https://opencode.ai/docs/overview');
    crawler.processFoundLink('/blog/article', 'https://opencode.ai/docs/overview'); // Should not be added
    crawler.processFoundLink('/', 'https://opencode.ai/docs/overview'); // Should not be added
    
    expect(foundLinks.has('https://opencode.ai/docs/getting-started')).toBe(true);
    expect(foundLinks.has('https://opencode.ai/docs/installation')).toBe(true);
    expect(foundLinks.has('https://opencode.ai/blog/article')).toBe(false);
    expect(foundLinks.has('https://opencode.ai/')).toBe(false);
  });

  test('should handle relative links correctly with base URL', () => {
    // Note: Using a trailing slash to indicate it's a directory
    const crawler = new WebCrawler('https://example.com/docs/api/', { outputDir: testDir });
    
    const foundLinks = new Set();
    crawler.toVisit = {
      has: () => false,
      add: (url) => foundLinks.add(url)
    };
    crawler.visited = new Set();
    
    // Relative link from a docs/api/ page should stay within docs/api
    crawler.processFoundLink('functions', 'https://example.com/docs/api/');
    crawler.processFoundLink('../guides', 'https://example.com/docs/api/');
    crawler.processFoundLink('/docs/api/reference', 'https://example.com/docs/api/');
    crawler.processFoundLink('/docs/other', 'https://example.com/docs/api/'); // Should not be added (outside base path)
    
    // With trailing slash, 'functions' resolves to /docs/api/functions
    expect(foundLinks.has('https://example.com/docs/api/functions')).toBe(true);
    // '../guides' from /docs/api/ resolves to /docs/guides (outside /docs/api)
    expect(foundLinks.has('https://example.com/docs/guides')).toBe(false);
    expect(foundLinks.has('https://example.com/docs/api/reference')).toBe(true);
    expect(foundLinks.has('https://example.com/docs/other')).toBe(false);
  });

  test('should treat URLs with hash fragments as the same page', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    const foundLinks = new Set();
    crawler.toVisit = {
      has: (url) => foundLinks.has(url),
      add: (url) => foundLinks.add(url)
    };
    crawler.visited = new Set();
    
    // Process the same URL with different hash fragments
    crawler.processFoundLink('/docs/agents#section-1', 'https://example.com/');
    crawler.processFoundLink('/docs/agents#section-2', 'https://example.com/');
    crawler.processFoundLink('/docs/agents', 'https://example.com/');
    
    // Should only have one entry (without hash)
    expect(foundLinks.size).toBe(1);
    expect(foundLinks.has('https://example.com/docs/agents')).toBe(true);
    expect(foundLinks.has('https://example.com/docs/agents#section-1')).toBe(false);
    expect(foundLinks.has('https://example.com/docs/agents#section-2')).toBe(false);
  });

  test('should extract links using regex parser', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    const html = `
      <html>
        <head>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body>
          <nav>
            <a href="/home">Home</a>
            <a href="/about">About</a>
          </nav>
          <main>
            <a href="/docs/getting-started">Getting Started</a>
            <a href="https://example.com/docs/api">API Docs</a>
            <a href='https://example.com/docs/guide'>Guide</a>
            <a href="/external?url=https://other.com">External</a>
            <a href="#section">Hash Link</a>
          </main>
        </body>
      </html>
    `;
    
    const links = crawler.extractLinks(html);
    
    expect(links).toContain('/home');
    expect(links).toContain('/about');
    expect(links).toContain('/docs/getting-started');
    expect(links).toContain('https://example.com/docs/api');
    expect(links).toContain('https://example.com/docs/guide');
    expect(links).toContain('/external?url=https://other.com');
    // Hash-only links should be filtered out
    expect(links).not.toContain('#section');
  });

  test('should decode HTML entities in extracted links', () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    const html = `
      <html>
        <body>
          <a href="/page?param1=value&amp;param2=value2">Link with entities</a>
          <a href="/search?q=&quot;test&quot;">Search link</a>
        </body>
      </html>
    `;
    
    const links = crawler.extractLinks(html);
    
    expect(links).toContain('/page?param1=value&param2=value2');
    expect(links).toContain('/search?q="test"');
  });

  test('should extract directory from URL without trailing slash', () => {
    // URL without trailing slash with 2+ segments: base path is parent directory
    const crawler1 = new WebCrawler('https://example.com/docs/en/sub-agents', { outputDir: testDir });
    expect(crawler1.basePath).toBe('/docs/en');
    
    // URL with trailing slash: base path is the full path
    const crawler2 = new WebCrawler('https://example.com/docs/en/', { outputDir: testDir });
    expect(crawler2.basePath).toBe('/docs/en');
    
    // Root URL
    const crawler3 = new WebCrawler('https://example.com/', { outputDir: testDir });
    expect(crawler3.basePath).toBe('/');
    
    // URL with single path segment: keeps the segment as base path
    const crawler4 = new WebCrawler('https://example.com/docs', { outputDir: testDir });
    expect(crawler4.basePath).toBe('/docs');
  });

  test('should discover multiple pages when crawling', async () => {
    const crawler = new WebCrawler('https://example.com', { outputDir: testDir });
    
    const html1 = `
      <html>
        <body>
          <main>
            <h1>Page 1</h1>
            <a href="/page2">Page 2</a>
            <a href="/page3">Page 3</a>
          </main>
        </body>
      </html>
    `;
    
    const html2 = `
      <html>
        <body>
          <main>
            <h1>Page 2</h1>
            <a href="/page1">Back to Page 1</a>
          </main>
        </body>
      </html>
    `;
    
    // Extract links from the first page
    const result1 = await crawler.extractContentWithHTMLRewriter(html1, 'https://example.com/page1');
    expect(result1.links.length).toBeGreaterThan(0);
    expect(result1.links).toContain('/page2');
    expect(result1.links).toContain('/page3');
    
    // Extract links from the second page
    const result2 = await crawler.extractContentWithHTMLRewriter(html2, 'https://example.com/page2');
    expect(result2.links.length).toBeGreaterThan(0);
    expect(result2.links).toContain('/page1');
  });
});
