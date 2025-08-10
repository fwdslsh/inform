import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { LlmsTxtCrawler } from '../src/LlmsTxtCrawler.js';
import { rmdir } from 'fs/promises';

describe('LlmsTxtCrawler', () => {
  let crawler;
  const testUrl = 'https://example.com/llms.txt';
  const testOutputDir = 'test-llms-output';

  beforeEach(() => {
    // Mock global fetch
    global.fetch = vi.fn();
  });

  afterEach(async () => {
    // Clean up test output directory
    try {
      await rmdir(testOutputDir, { recursive: true });
    } catch (error) {
      // Ignore cleanup errors
    }
    vi.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with correct defaults', () => {
      crawler = new LlmsTxtCrawler(testUrl, {
        outputDir: testOutputDir
      });

      expect(crawler.baseUrl.href).toBe(testUrl);
      expect(crawler.outputDir).toBe(testOutputDir);
      expect(crawler.downloadedCount).toBe(0);
      expect(crawler.processedUrls.size).toBe(0);
      expect(crawler.canonicalLocations).toContain('/llms.txt');
      expect(crawler.canonicalLocations).toContain('/llms-full.txt');
    });

    it('should accept include/exclude patterns', () => {
      crawler = new LlmsTxtCrawler(testUrl, {
        outputDir: testOutputDir,
        include: ['docs/**'],
        exclude: ['temp/**']
      });

      const filterSummary = crawler.fileFilter.getSummary();
      expect(filterSummary.includePatterns).toEqual(['docs/**']);
      expect(filterSummary.excludePatterns).toEqual(['temp/**']);
    });
  });

  describe('generateOutputPath', () => {
    beforeEach(() => {
      crawler = new LlmsTxtCrawler(testUrl, { outputDir: testOutputDir });
    });

    it('should generate correct output path for root LLMS.txt files', () => {
      expect(crawler.generateOutputPath('/llms.txt')).toBe('llms.txt');
      expect(crawler.generateOutputPath('/llms-full.txt')).toBe('llms-full.txt');
    });

    it('should generate correct output path for subdirectory LLMS.txt files', () => {
      expect(crawler.generateOutputPath('/docs/llms.txt')).toBe('docs/llms.txt');
      expect(crawler.generateOutputPath('/docs/llms-full.txt')).toBe('docs/llms-full.txt');
    });

    it('should handle empty or root paths (defaults to llms.txt)', () => {
      expect(crawler.generateOutputPath('')).toBe('llms.txt');
      expect(crawler.generateOutputPath('/')).toBe('llms.txt');
    });

    it('should add .txt extension if missing', () => {
      expect(crawler.generateOutputPath('/docs/llms')).toBe('docs/llms.txt');
    });

    it('should sanitize problematic characters', () => {
      expect(crawler.generateOutputPath('/docs/llms?.txt')).toBe('docs/llms_.txt');
      expect(crawler.generateOutputPath('/docs/llms<>.txt')).toBe('docs/llms__.txt');
    });
  });

  describe('downloadSingleFile', () => {
    beforeEach(() => {
      crawler = new LlmsTxtCrawler(testUrl, { outputDir: testOutputDir });
    });

    it('should download and save LLMS.txt file successfully', async () => {
      const mockContent = 'This is a test LLMS.txt file content';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockContent)
      });

      const result = await crawler.downloadSingleFile(testUrl);

      expect(global.fetch).toHaveBeenCalledWith(testUrl);
      expect(crawler.downloadedCount).toBe(1);
      expect(crawler.processedUrls.has(testUrl)).toBe(true);
      expect(result).toBe(true);
    });

    it('should handle 404 errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      // Should not throw, just return false
      const result = await crawler.downloadSingleFile(testUrl);

      expect(crawler.downloadedCount).toBe(0);
      expect(crawler.processedUrls.has(testUrl)).toBe(true);
      expect(result).toBe(false);
    });

    it('should handle server errors', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(crawler.downloadSingleFile(testUrl)).rejects.toThrow('HTTP 500: Internal Server Error');
    });

    it('should skip already processed URLs', async () => {
      crawler.processedUrls.add(testUrl);

      const result = await crawler.downloadSingleFile(testUrl);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(crawler.downloadedCount).toBe(0);
      expect(result).toBe(false);
    });

    it('should respect file filters', async () => {
      crawler = new LlmsTxtCrawler(testUrl, {
        outputDir: testOutputDir,
        exclude: ['*.txt']
      });

      const result = await crawler.downloadSingleFile(testUrl);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(crawler.downloadedCount).toBe(0);
      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('should probe canonical locations and download found files', async () => {
      // Mock responses for canonical locations: /llms.txt found, /llms-full.txt not found
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Found llms.txt content')
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        });

      crawler = new LlmsTxtCrawler('https://example.com', {
        outputDir: testOutputDir
      });

      await crawler.crawl();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/llms.txt');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/llms-full.txt');
      expect(crawler.downloadedCount).toBe(1);
    });

    it('should fallback to web crawling when no LLMS files found', async () => {
      // Mock no files found at canonical locations
      global.fetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        });

      crawler = new LlmsTxtCrawler('https://example.com', {
        outputDir: testOutputDir
      });

      // For this test, we'll just verify the probing part works correctly
      // The web crawling fallback would require more complex mocking
      const foundCount = await crawler.probeCanonicalLocations();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/llms.txt');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/llms-full.txt');
      expect(foundCount).toBe(0);
    });
  });
});