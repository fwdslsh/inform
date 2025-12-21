import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'bun:test';
import { WebCrawler } from '../../src/WebCrawler.js';
import { TestServer } from './test-server.js';
import { readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

describe('WebCrawler Integration Tests', () => {
  let server;
  let baseUrl;
  const testOutputDir = 'test-output-integration';

  beforeAll(async () => {
    server = new TestServer();
    baseUrl = await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    server.clearRequestLog();
  });

  afterEach(async () => {
    if (existsSync(testOutputDir)) {
      await rm(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should crawl multiple pages and save them as markdown', async () => {
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 5,
      delay: 0,
      outputDir: testOutputDir,
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const files = await readdir(testOutputDir, { recursive: true });
    const mdFiles = files.filter((f) => f.endsWith('.md'));

    expect(mdFiles.length).toBeGreaterThan(0);
    expect(mdFiles).toContain('index.md');
  });

  it('should follow links and crawl linked pages', async () => {
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 5,
      delay: 0,
      outputDir: testOutputDir,
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const requestLog = server.getRequestLog();
    const htmlRequests = requestLog.filter(
      (req) => req.path !== '/robots.txt' && req.path !== '/non-html'
    );

    expect(htmlRequests.length).toBeGreaterThan(1);
    expect(server.getRequestCount('/')).toBeGreaterThan(0);
  });

  it('should respect robots.txt by default', async () => {
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 10,
      delay: 0,
      outputDir: testOutputDir,
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const requestLog = server.getRequestLog();
    const adminRequests = requestLog.filter((req) => req.path === '/admin/secret');

    expect(adminRequests.length).toBe(0);
  });

  it('should save files in correct directory structure', async () => {
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 5,
      delay: 0,
      outputDir: testOutputDir,
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const files = await readdir(testOutputDir, { recursive: true });
    const hasNestedStructure = files.some((f) => f.includes('docs'));

    expect(hasNestedStructure).toBe(true);
  });

  it('should convert HTML to markdown correctly', async () => {
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 3,
      delay: 0,
      outputDir: testOutputDir,
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const indexPath = join(testOutputDir, 'index.md');
    const content = await Bun.file(indexPath).text();

    expect(content).toContain('# Home Page');
    expect(content).toContain('[Page 1]');
  });

  it('should save raw HTML when --raw flag is set', async () => {
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 2,
      delay: 0,
      outputDir: testOutputDir,
      raw: true,
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const files = await readdir(testOutputDir, { recursive: true });
    const htmlFiles = files.filter((f) => f.endsWith('.html'));

    expect(htmlFiles.length).toBeGreaterThan(0);
    expect(files.some((f) => f === 'index.html')).toBe(true);
  });

  it('should track failures and successes', async () => {
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 5,
      delay: 0,
      outputDir: testOutputDir,
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    expect(crawler.successes.size).toBeGreaterThan(0);
    expect(crawler.failures).toBeDefined();
    expect(crawler.failures instanceof Map).toBe(true);
  });
});
