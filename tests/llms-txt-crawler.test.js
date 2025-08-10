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
      expect(crawler.discoverMode).toBe(false);
      expect(crawler.downloadedCount).toBe(0);
      expect(crawler.processedUrls.size).toBe(0);
      expect(crawler.commonLocations).toContain('/llms.txt');
      expect(crawler.commonLocations).toContain('/llms-full.txt');
    });

    it('should enable discovery mode when specified', () => {
      crawler = new LlmsTxtCrawler(testUrl, {
        outputDir: testOutputDir,
        discoverMode: true
      });

      expect(crawler.discoverMode).toBe(true);
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

  describe('Static Methods', () => {
    describe('isLlmsTxtUrl', () => {
      it('should detect LLMS.txt URLs (llms.txt, llms-full.txt, and llm.txt for backward compatibility)', () => {
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://example.com/llms.txt')).toBe(true);
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://example.com/llms-full.txt')).toBe(true);
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://example.com/llm.txt')).toBe(true);
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://docs.example.com/llms.txt')).toBe(true);
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://api.example.com/v1/llms-full.txt')).toBe(true);
      });

      it('should not detect non-LLMS.txt URLs', () => {
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://example.com/readme.txt')).toBe(false);
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://example.com/docs')).toBe(false);
        expect(LlmsTxtCrawler.isLlmsTxtUrl('https://example.com')).toBe(false);
      });

      it('should handle invalid URLs gracefully', () => {
        expect(LlmsTxtCrawler.isLlmsTxtUrl('not-a-url')).toBe(false);
        expect(LlmsTxtCrawler.isLlmsTxtUrl('')).toBe(false);
      });
    });

    describe('getDiscoveryBaseUrl', () => {
      it('should extract base URL from LLMS.txt file URLs', () => {
        expect(LlmsTxtCrawler.getDiscoveryBaseUrl('https://example.com/docs/llms.txt')).toBe('https://example.com/docs/');
        expect(LlmsTxtCrawler.getDiscoveryBaseUrl('https://example.com/docs/llms-full.txt')).toBe('https://example.com/docs/');
        expect(LlmsTxtCrawler.getDiscoveryBaseUrl('https://example.com/docs/llm.txt')).toBe('https://example.com/docs/');
      });

      it('should handle root level LLMS.txt files', () => {
        expect(LlmsTxtCrawler.getDiscoveryBaseUrl('https://example.com/llms.txt')).toBe('https://example.com/');
        expect(LlmsTxtCrawler.getDiscoveryBaseUrl('https://example.com/llms-full.txt')).toBe('https://example.com/');
        expect(LlmsTxtCrawler.getDiscoveryBaseUrl('https://example.com/llm.txt')).toBe('https://example.com/');
      });

      it('should leave non-LLMS.txt URLs unchanged', () => {
        const url = 'https://example.com/docs';
        const result = LlmsTxtCrawler.getDiscoveryBaseUrl(url);
        expect(result).toBe(url);
      });
    });
  });

  describe('generateOutputPath', () => {
    beforeEach(() => {
      crawler = new LlmsTxtCrawler(testUrl, { outputDir: testOutputDir });
    });

    it('should generate correct output path for root LLMS.txt files', () => {
      expect(crawler.generateOutputPath('/llms.txt')).toBe('llms.txt');
      expect(crawler.generateOutputPath('/llms-full.txt')).toBe('llms-full.txt');
      expect(crawler.generateOutputPath('/llm.txt')).toBe('llm.txt');
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

      await crawler.downloadSingleFile(testUrl);

      expect(global.fetch).toHaveBeenCalledWith(testUrl);
      expect(crawler.downloadedCount).toBe(1);
      expect(crawler.processedUrls.has(testUrl)).toBe(true);
    });

    it('should handle 404 errors gracefully', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      // Should not throw, just log and continue
      await crawler.downloadSingleFile(testUrl);

      expect(crawler.downloadedCount).toBe(0);
      expect(crawler.processedUrls.has(testUrl)).toBe(true);
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

      await crawler.downloadSingleFile(testUrl);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(crawler.downloadedCount).toBe(0);
    });

    it('should respect file filters', async () => {
      crawler = new LlmsTxtCrawler(testUrl, {
        outputDir: testOutputDir,
        exclude: ['*.txt']
      });

      await crawler.downloadSingleFile(testUrl);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(crawler.downloadedCount).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle direct download mode', async () => {
      const mockContent = 'Direct download test content';
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve(mockContent)
      });

      crawler = new LlmsTxtCrawler(testUrl, {
        outputDir: testOutputDir,
        discoverMode: false
      });

      await crawler.crawl();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(crawler.downloadedCount).toBe(1);
    });

    it('should handle probe mode with canonical locations', async () => {
      // Mock responses for canonical locations: /llms.txt and /llms-full.txt
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Root llms.txt content')
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        });

      crawler = new LlmsTxtCrawler('https://example.com', {
        outputDir: testOutputDir,
        discoverMode: true
      });

      await crawler.crawl();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/llms.txt');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/llms-full.txt');
      expect(crawler.downloadedCount).toBe(1);
    });
  });
});