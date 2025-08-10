import { describe, it, expect } from 'bun:test';
import { FileFilter } from '../src/FileFilter.js';

describe('FileFilter', () => {
  describe('shouldInclude', () => {
    it('should include all files when no patterns are specified', () => {
      const filter = new FileFilter();
      expect(filter.shouldInclude('README.md')).toBe(true);
      expect(filter.shouldInclude('docs/api.md')).toBe(true);
      expect(filter.shouldInclude('src/index.js')).toBe(true);
    });

    it('should include only matching files when include patterns are specified', () => {
      const filter = new FileFilter({ include: ['*.md', '**/*.md'] });
      expect(filter.shouldInclude('README.md')).toBe(true);
      expect(filter.shouldInclude('docs/api.md')).toBe(true);
      expect(filter.shouldInclude('src/index.js')).toBe(false);
    });

    it('should exclude matching files when exclude patterns are specified', () => {
      const filter = new FileFilter({ exclude: ['*.js', '**/*.js'] });
      expect(filter.shouldInclude('README.md')).toBe(true);
      expect(filter.shouldInclude('docs/api.md')).toBe(true);
      expect(filter.shouldInclude('src/index.js')).toBe(false);
    });

    it('should handle both include and exclude patterns', () => {
      const filter = new FileFilter({ 
        include: ['docs/**'],
        exclude: ['**/*.tmp']
      });
      expect(filter.shouldInclude('docs/api.md')).toBe(true);
      expect(filter.shouldInclude('docs/temp.tmp')).toBe(false);
      expect(filter.shouldInclude('src/index.js')).toBe(false);
    });

    it('should handle complex glob patterns', () => {
      const filter = new FileFilter({ 
        include: ['docs/**/*.md', 'README.md'],
        exclude: ['**/node_modules/**', '**/.git/**']
      });
      expect(filter.shouldInclude('README.md')).toBe(true);
      expect(filter.shouldInclude('docs/api/endpoints.md')).toBe(true);
      expect(filter.shouldInclude('docs/setup.md')).toBe(true);
      expect(filter.shouldInclude('src/index.js')).toBe(false);
      expect(filter.shouldInclude('node_modules/package/index.js')).toBe(false);
      expect(filter.shouldInclude('docs/node_modules/something.md')).toBe(false);
    });

    it('should normalize path separators', () => {
      const filter = new FileFilter({ include: ['docs/**/*.md'] });
      expect(filter.shouldInclude('docs/api/endpoints.md')).toBe(true);
      expect(filter.shouldInclude('docs\\api\\endpoints.md')).toBe(true); // Windows paths
    });

    it('should handle string patterns (not arrays)', () => {
      const filter = new FileFilter({ 
        include: '*.md',
        exclude: '*.tmp'
      });
      expect(filter.shouldInclude('README.md')).toBe(true);
      expect(filter.shouldInclude('temp.tmp')).toBe(false);
      expect(filter.shouldInclude('script.js')).toBe(false);
    });
  });

  describe('filterPaths', () => {
    it('should filter an array of paths', () => {
      const filter = new FileFilter({ include: ['*.md', '**/*.md'] });
      const paths = ['README.md', 'script.js', 'docs/api.md', 'package.json'];
      const filtered = filter.filterPaths(paths);
      expect(filtered).toEqual(['README.md', 'docs/api.md']);
    });
  });

  describe('shouldCrawlUrl', () => {
    it('should handle URL filtering for web crawling', () => {
      const filter = new FileFilter({ include: ['docs/**'] });
      expect(filter.shouldCrawlUrl('https://example.com/docs/api')).toBe(true);
      expect(filter.shouldCrawlUrl('https://example.com/blog/post')).toBe(false);
      expect(filter.shouldCrawlUrl('https://example.com/')).toBe(false);
    });

    it('should handle root URLs', () => {
      const filter = new FileFilter({ include: ['index.html'] });
      expect(filter.shouldCrawlUrl('https://example.com/')).toBe(true);
      expect(filter.shouldCrawlUrl('https://example.com')).toBe(true);
    });

    it('should handle invalid URLs gracefully', () => {
      const filter = new FileFilter({ include: ['*.md'] });
      expect(filter.shouldCrawlUrl('not-a-url')).toBe(true); // Default to include
    });
  });

  describe('getSummary', () => {
    it('should return filter summary', () => {
      const filter = new FileFilter({ 
        include: ['*.md'],
        exclude: ['*.tmp']
      });
      const summary = filter.getSummary();
      expect(summary.includePatterns).toEqual(['*.md']);
      expect(summary.excludePatterns).toEqual(['*.tmp']);
      expect(summary.hasFilters).toBe(true);
    });

    it('should indicate when no filters are set', () => {
      const filter = new FileFilter();
      const summary = filter.getSummary();
      expect(summary.hasFilters).toBe(false);
    });
  });
});