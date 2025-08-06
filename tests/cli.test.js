import { describe, it, expect, beforeEach, vi } from 'bun:test';
import { JSDOM } from 'jsdom';

import { WebCrawler } from '../src/WebCrawler.js';

describe('WebCrawler', () => {
  let crawler;
  const baseUrl = 'https://example.com';

  beforeEach(() => {
    crawler = new WebCrawler(baseUrl, {
      maxPages: 5,
      delay: 0,
      outputDir: 'test-output',
      concurrency: 1
    });
  });

  it('should initialize with correct defaults', () => {
    expect(crawler.baseUrl.href).toBe(baseUrl + '/');
    expect(crawler.maxPages).toBe(5);
    expect(crawler.delay).toBe(300);
    expect(crawler.outputDir).toBe('test-output');
    expect(crawler.concurrency).toBe(1);
    expect(crawler.visited.size).toBe(0);
    expect(crawler.toVisit.has(baseUrl)).toBe(true);
  });

  it('should skip non-HTML file extensions', () => {
    expect(crawler.shouldSkipFile('/foo.pdf')).toBe(true);
    expect(crawler.shouldSkipFile('/bar.jpg')).toBe(true);
    expect(crawler.shouldSkipFile('/baz.js')).toBe(true);
    expect(crawler.shouldSkipFile('/index.html')).toBe(false);
    expect(crawler.shouldSkipFile('/docs/')).toBe(false);
  });

  it('should generate correct filepaths', () => {
    expect(crawler.generateFilepath('https://example.com/')).toBe('index.md');
    expect(crawler.generateFilepath('https://example.com/docs/api')).toBe('docs/api.md');
    expect(crawler.generateFilepath('https://example.com/foo?bar=baz')).toMatch(/foo_bar_baz\.md$/);
  });

  it('should clean up markdown', () => {
    const dirty = '[link]()\n\n\n\n# Title\n\n\n```js\nconsole.log(1);\n```\n\n';
    const cleaned = crawler.cleanupMarkdown(dirty);
    expect(cleaned).not.toMatch(/\[\]\(/);
    expect(cleaned).toMatch(/# Title/);
    expect(cleaned).toMatch(/```js/);
  });

  it('should remove unwanted elements from DOM', () => {
    const dom = new JSDOM('<body><nav></nav><main><div>content</div></main></body>');
    const main = dom.window.document.querySelector('main');
    crawler.removeUnwantedElements(main);
    expect(main.querySelector('nav')).toBe(null);
    expect(main.textContent).toContain('content');
  });

  it('should preserve code blocks in DOM', () => {
    const dom = new JSDOM('<body><main><pre><code class="language-js">console.log(1);</code></pre></main></body>');
    const main = dom.window.document.querySelector('main');
    crawler.preserveCodeBlocks(main);
    const code = main.querySelector('code');
    expect(code.getAttribute('data-preserve')).toBe('true');
    expect(code.getAttribute('data-contains-html')).toBe(null);
  });

  it('should extract main content from DOM', () => {
    const dom = new JSDOM('<body><main><div>main content</div></main></body>');
    const content = crawler.extractMainContent(dom.window.document);
    expect(content).toContain('main content');
  });

  it('should find and queue valid links', () => {
    const dom = new JSDOM('<body><a href="/foo">Foo</a><a href="https://other.com/bar">Bar</a></body>');
    crawler.findLinks(dom.window.document, baseUrl);
    expect(crawler.toVisit.has('https://example.com/foo')).toBe(true);
    expect(crawler.toVisit.has('https://other.com/bar')).toBe(false);
  });
});
