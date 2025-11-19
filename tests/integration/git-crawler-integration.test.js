import { describe, it, expect, afterEach } from 'bun:test';
import { GitCrawler } from '../../src/GitCrawler.js';
import { readdir, rm } from 'fs/promises';
import { existsSync } from 'fs';

describe('GitCrawler Integration Tests', () => {
  const testOutputDir = 'test-output-git-integration';

  afterEach(async () => {
    if (existsSync(testOutputDir)) {
      await rm(testOutputDir, { recursive: true, force: true });
    }
  });

  it('should download files from a public GitHub repository', async () => {
    const gitUrl = 'https://github.com/fwdslsh/inform';

    const crawler = new GitCrawler(gitUrl, {
      outputDir: testOutputDir,
      include: ['README.md'],
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const files = await readdir(testOutputDir, { recursive: true });
    expect(files).toContain('README.md');
    expect(crawler.downloadedCount).toBeGreaterThan(0);
  }, 30000);

  it('should respect include patterns', async () => {
    const gitUrl = 'https://github.com/fwdslsh/inform';

    const crawler = new GitCrawler(gitUrl, {
      outputDir: testOutputDir,
      include: ['*.md'],
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    const files = await readdir(testOutputDir, { recursive: true });
    const downloadedFiles = files.filter(
      (f) => f.includes('.') && !f.startsWith('.')
    );

    const allMatch = downloadedFiles.every((f) => f.endsWith('.md'));
    expect(allMatch).toBe(true);
    expect(downloadedFiles.length).toBeGreaterThan(0);
  }, 30000);

  it('should download from a subdirectory', async () => {
    const gitUrl = 'https://github.com/fwdslsh/inform/tree/main/src';

    const crawler = new GitCrawler(gitUrl, {
      outputDir: testOutputDir,
      include: ['*.js'],
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    expect(crawler.repoInfo.subdirectory).toBe('src');

    const files = await readdir(testOutputDir, { recursive: true });
    const jsFiles = files.filter((f) => f.endsWith('.js'));

    expect(jsFiles.length).toBeGreaterThan(0);
  }, 30000);

  it('should track download successes', async () => {
    const gitUrl = 'https://github.com/fwdslsh/inform';

    const crawler = new GitCrawler(gitUrl, {
      outputDir: testOutputDir,
      include: ['README.md'],
      logLevel: 'quiet',
      ignoreErrors: true,
    });

    await crawler.crawl();

    expect(crawler.downloadedCount).toBeGreaterThan(0);
    expect(crawler.failures).toBeDefined();
    expect(crawler.failures instanceof Map).toBe(true);
  }, 30000);
});
