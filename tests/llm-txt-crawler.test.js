import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { LlmTxtCrawler } from '../src/LlmTxtCrawler.js';
import { rmdir } from 'fs/promises';

describe('LlmTxtCrawler', () => {
  let crawler;
  const testUrl = 'https://example.com/llm.txt';
  const testOutputDir = 'test-llm-output';

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
      crawler = new LlmTxtCrawler(testUrl, {
        outputDir: testOutputDir
      });

      expect(crawler.baseUrl.href).toBe(testUrl);
      expect(crawler.outputDir).toBe(testOutputDir);
      expect(crawler.discoverMode).toBe(false);
      expect(crawler.downloadedCount).toBe(0);
      expect(crawler.processedUrls.size).toBe(0);
      expect(crawler.commonLocations).toContain('/llm.txt');
      expect(crawler.commonLocations).toContain('/docs/llm.txt');
    });

    it('should enable discovery mode when specified', () => {
      crawler = new LlmTxtCrawler(testUrl, {
        outputDir: testOutputDir,
        discoverMode: true
      });

      expect(crawler.discoverMode).toBe(true);
    });

    it('should accept include/exclude patterns', () => {
      crawler = new LlmTxtCrawler(testUrl, {
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
    describe('isLlmTxtUrl', () => {
      it('should detect llm.txt URLs', () => {
        expect(LlmTxtCrawler.isLlmTxtUrl('https://example.com/llm.txt')).toBe(true);
        expect(LlmTxtCrawler.isLlmTxtUrl('https://docs.example.com/llm.txt')).toBe(true);
        expect(LlmTxtCrawler.isLlmTxtUrl('https://api.example.com/v1/llm.txt')).toBe(true);
      });

      it('should not detect non-llm.txt URLs', () => {
        expect(LlmTxtCrawler.isLlmTxtUrl('https://example.com/readme.txt')).toBe(false);
        expect(LlmTxtCrawler.isLlmTxtUrl('https://example.com/docs')).toBe(false);
        expect(LlmTxtCrawler.isLlmTxtUrl('https://example.com')).toBe(false);
      });

      it('should handle invalid URLs gracefully', () => {
        expect(LlmTxtCrawler.isLlmTxtUrl('not-a-url')).toBe(false);
        expect(LlmTxtCrawler.isLlmTxtUrl('')).toBe(false);
      });
    });

    describe('getDiscoveryBaseUrl', () => {
      it('should extract base URL from llm.txt file URL', () => {
        const result = LlmTxtCrawler.getDiscoveryBaseUrl('https://example.com/docs/llm.txt');
        expect(result).toBe('https://example.com/docs/');
      });

      it('should handle root level llm.txt', () => {
        const result = LlmTxtCrawler.getDiscoveryBaseUrl('https://example.com/llm.txt');
        expect(result).toBe('https://example.com/');
      });

      it('should leave non-llm.txt URLs unchanged', () => {
        const url = 'https://example.com/docs';
        const result = LlmTxtCrawler.getDiscoveryBaseUrl(url);
        expect(result).toBe(url);
      });
    });
  });

  describe('generateOutputPath', () => {
    beforeEach(() => {
      crawler = new LlmTxtCrawler(testUrl, { outputDir: testOutputDir });
    });

    it('should generate correct output path for root llm.txt', () => {
      expect(crawler.generateOutputPath('/llm.txt')).toBe('llm.txt');
    });

    it('should generate correct output path for subdirectory llm.txt', () => {
      expect(crawler.generateOutputPath('/docs/llm.txt')).toBe('docs/llm.txt');
    });

    it('should handle empty or root paths', () => {
      expect(crawler.generateOutputPath('')).toBe('llm.txt');
      expect(crawler.generateOutputPath('/')).toBe('llm.txt');
    });

    it('should add .txt extension if missing', () => {
      expect(crawler.generateOutputPath('/docs/llm')).toBe('docs/llm.txt');
    });

    it('should sanitize problematic characters', () => {
      expect(crawler.generateOutputPath('/docs/llm?.txt')).toBe('docs/llm_.txt');
      expect(crawler.generateOutputPath('/docs/llm<>.txt')).toBe('docs/llm__.txt');
    });
  });

  describe('downloadSingleFile', () => {
    beforeEach(() => {
      crawler = new LlmTxtCrawler(testUrl, { outputDir: testOutputDir });
    });

    it('should download and save llm.txt file successfully', async () => {
      const mockContent = 'This is a test LLM.txt file content';
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
      crawler = new LlmTxtCrawler(testUrl, {
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

      crawler = new LlmTxtCrawler(testUrl, {
        outputDir: testOutputDir,
        discoverMode: false
      });

      await crawler.crawl();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(crawler.downloadedCount).toBe(1);
    });

    it('should handle discovery mode', async () => {
      // Mock multiple responses for different discovery locations
      global.fetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Root llm.txt content')
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve('Docs llm.txt content')
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404
        });

      crawler = new LlmTxtCrawler('https://example.com', {
        outputDir: testOutputDir,
        discoverMode: true
      });

      await crawler.crawl();

      expect(global.fetch).toHaveBeenCalledTimes(5); // Five discovery attempts
      expect(crawler.downloadedCount).toBe(2); // Two successful downloads
    });
  });
});