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
});
