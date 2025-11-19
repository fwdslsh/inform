import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { GitCrawler } from '../src/GitCrawler.js';

describe('GitCrawler', () => {
  let mockFetch;
  let originalFetch;

  beforeEach(() => {
    // Save original fetch before mocking
    originalFetch = global.fetch;

    // Mock global fetch for testing
    mockFetch = mock(() => {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve([
          {
            name: 'README.md',
            type: 'file',
            path: 'README.md',
            content: 'IyBUZXN0IFJlYWRtZQ==', // Base64 for "# Test Readme"
            size: 512,
            download_url: 'https://raw.githubusercontent.com/owner/repo/main/README.md'
          },
          {
            name: 'docs',
            type: 'dir',
            path: 'docs'
          },
          {
            name: 'package.json',
            type: 'file',
            path: 'package.json',
            content: 'eyJuYW1lIjoidGVzdCJ9', // Base64 for {"name":"test"}
            size: 256,
            download_url: 'https://raw.githubusercontent.com/owner/repo/main/package.json'
          }
        ])
      });
    });

    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore original fetch to prevent test pollution
    global.fetch = originalFetch;
  });

  it('should initialize with correct repository information', () => {
    const crawler = new GitCrawler('https://github.com/owner/repo', {
      include: ['*.md'],
      outputDir: 'test-output'
    });

    expect(crawler.repoInfo.owner).toBe('owner');
    expect(crawler.repoInfo.repo).toBe('repo');
    expect(crawler.repoInfo.branch).toBe('main');
    expect(crawler.outputDir).toBe('test-output');
    expect(crawler.fileFilter.includePatterns).toEqual(['*.md']);
  });

  it('should parse subdirectory from URL', () => {
    const crawler = new GitCrawler('https://github.com/owner/repo/tree/main/docs');
    
    expect(crawler.repoInfo.owner).toBe('owner');
    expect(crawler.repoInfo.repo).toBe('repo');
    expect(crawler.repoInfo.branch).toBe('main');
    expect(crawler.repoInfo.subdirectory).toBe('docs');
  });

  it('should handle different branch from URL', () => {
    const crawler = new GitCrawler('https://github.com/owner/repo/tree/develop');
    
    expect(crawler.repoInfo.branch).toBe('develop');
  });

  const normalizePath = (path) => path.replace(/\\/g, '/');

  it('should generate correct local paths', () => {
    const crawler = new GitCrawler('https://github.com/owner/repo', {
      outputDir: 'output'
    });

    expect(normalizePath(crawler.generateLocalPath('README.md'))).toBe('output/README.md');
    expect(normalizePath(crawler.generateLocalPath('docs/api.md'))).toBe('output/docs/api.md');
  });

  it('should generate correct local paths with subdirectory', () => {
    const crawler = new GitCrawler('https://github.com/owner/repo/tree/main/docs', {
      outputDir: 'output'
    });

    expect(normalizePath(crawler.generateLocalPath('docs/README.md'))).toBe('output/README.md');
    expect(normalizePath(crawler.generateLocalPath('docs/api/endpoints.md'))).toBe('output/api/endpoints.md');
  });

  it('should determine if directory should be explored', () => {
    const crawlerWithIncludes = new GitCrawler('https://github.com/owner/repo', {
      include: ['docs/**/*.md']
    });

    expect(crawlerWithIncludes.shouldExploreDirectory('docs')).toBe(true);
    expect(crawlerWithIncludes.shouldExploreDirectory('src')).toBe(false);

    const crawlerWithoutIncludes = new GitCrawler('https://github.com/owner/repo');
    expect(crawlerWithoutIncludes.shouldExploreDirectory('docs')).toBe(true);
    expect(crawlerWithoutIncludes.shouldExploreDirectory('src')).toBe(true);
  });

  it('should correctly identify binary files', () => {
    const crawler = new GitCrawler('https://github.com/owner/repo');
    
    // Test binary file extensions
    expect(crawler.isBinaryFile('image.png')).toBe(true);
    expect(crawler.isBinaryFile('photo.jpg')).toBe(true);
    expect(crawler.isBinaryFile('document.pdf')).toBe(true);
    expect(crawler.isBinaryFile('archive.zip')).toBe(true);
    expect(crawler.isBinaryFile('program.exe')).toBe(true);
    expect(crawler.isBinaryFile('audio.mp3')).toBe(true);
    expect(crawler.isBinaryFile('font.woff2')).toBe(true);
    
    // Test text file extensions
    expect(crawler.isBinaryFile('README.md')).toBe(false);
    expect(crawler.isBinaryFile('script.js')).toBe(false);
    expect(crawler.isBinaryFile('style.css')).toBe(false);
    expect(crawler.isBinaryFile('config.json')).toBe(false);
    expect(crawler.isBinaryFile('index.html')).toBe(false);
    expect(crawler.isBinaryFile('data.txt')).toBe(false);
    
    // Test case insensitivity
    expect(crawler.isBinaryFile('IMAGE.PNG')).toBe(true);
    expect(crawler.isBinaryFile('Photo.JPG')).toBe(true);
  });
});