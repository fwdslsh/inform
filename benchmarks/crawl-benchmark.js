import { WebCrawler } from '../src/WebCrawler.js';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * Test server that provides consistent pages for benchmarking
 */
class BenchmarkServer {
  constructor(port = 0) {
    this.port = port;
    this.server = null;
    this.baseUrl = null;
  }

  async start() {
    const testPages = {
      '/': `<!DOCTYPE html>
<html>
<head><title>Home</title></head>
<body>
  <h1>Home Page</h1>
  <a href="/page1">Page 1</a>
  <a href="/page2">Page 2</a>
  <a href="/page3">Page 3</a>
  <a href="/page4">Page 4</a>
</body>
</html>`,
      '/page1': `<!DOCTYPE html><html><head><title>Page 1</title></head><body><h1>Page 1</h1><p>Content here</p></body></html>`,
      '/page2': `<!DOCTYPE html><html><head><title>Page 2</title></head><body><h1>Page 2</h1><p>More content</p></body></html>`,
      '/page3': `<!DOCTYPE html><html><head><title>Page 3</title></head><body><h1>Page 3</h1><p>Even more content</p></body></html>`,
      '/page4': `<!DOCTYPE html><html><head><title>Page 4</title></head><body><h1>Page 4</h1><p>Final page</p></body></html>`,
      '/robots.txt': 'User-agent: *\nDisallow:',
    };

    this.server = Bun.serve({
      port: this.port,
      fetch: (req) => {
        const url = new URL(req.url);
        const path = url.pathname;

        if (path === '/robots.txt') {
          return new Response(testPages['/robots.txt'], {
            headers: { 'Content-Type': 'text/plain' },
          });
        }

        if (!(path in testPages)) {
          return new Response('Not Found', { status: 404 });
        }

        return new Response(testPages[path], {
          headers: { 'Content-Type': 'text/html' },
        });
      },
    });

    this.port = this.server.port;
    this.baseUrl = `http://localhost:${this.port}`;
    return this.baseUrl;
  }

  async stop() {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }
}

/**
 * Benchmark overall crawl performance
 */
async function benchmarkOverall() {
  const server = new BenchmarkServer();
  const baseUrl = await server.start();
  const outputDir = await mkdtemp(join(tmpdir(), 'inform-bench-'));

  const startTime = performance.now();
  const crawler = new WebCrawler(baseUrl, {
    maxPages: 5,
    delay: 0,
    outputDir,
    logLevel: 'quiet',
    ignoreRobots: false,
  });

  await crawler.crawl();
  const endTime = performance.now();
  const duration = endTime - startTime;

  await server.stop();
  await rm(outputDir, { recursive: true, force: true });

  const successCount = crawler.successes.size;
  const failureCount = crawler.failures.size;
  const avgPerPage = duration / successCount;
  const pagesPerSecond = (successCount / duration) * 1000;

  return {
    duration,
    avgPerPage,
    pagesPerSecond,
    pagesCrawled: successCount + failureCount,
    successCount,
  };
}

/**
 * Benchmark different concurrency levels
 */
async function benchmarkConcurrency() {
  const results = {};
  const concurrencyLevels = [1, 3, 5, 10];

  for (const concurrency of concurrencyLevels) {
    const server = new BenchmarkServer();
    const baseUrl = await server.start();
    const outputDir = await mkdtemp(join(tmpdir(), 'inform-bench-'));

    const startTime = performance.now();
    const crawler = new WebCrawler(baseUrl, {
      maxPages: 5,
      delay: 0,
      concurrency,
      outputDir,
      logLevel: 'quiet',
    });

    await crawler.crawl();
    const endTime = performance.now();
    const duration = endTime - startTime;

    await server.stop();
    await rm(outputDir, { recursive: true, force: true });

    const successCount = crawler.successes.size;
    const pagesPerSecond = (successCount / duration) * 1000;

    results[concurrency] = {
      duration,
      pagesPerSecond,
      avgPerPage: duration / successCount,
    };
  }

  return results;
}

/**
 * Benchmark file I/O performance (Markdown vs Raw HTML)
 */
async function benchmarkFileIO() {
  const results = {};

  // Benchmark Markdown output
  const serverMd = new BenchmarkServer();
  const baseUrlMd = await serverMd.start();
  const outputDirMd = await mkdtemp(join(tmpdir(), 'inform-bench-'));

  const startMd = performance.now();
  const crawlerMd = new WebCrawler(baseUrlMd, {
    maxPages: 5,
    delay: 0,
    outputDir: outputDirMd,
    logLevel: 'quiet',
    raw: false,
  });
  await crawlerMd.crawl();
  const endMd = performance.now();

  await serverMd.stop();
  await rm(outputDirMd, { recursive: true, force: true });

  results.markdown = endMd - startMd;

  // Benchmark Raw HTML output
  const serverRaw = new BenchmarkServer();
  const baseUrlRaw = await serverRaw.start();
  const outputDirRaw = await mkdtemp(join(tmpdir(), 'inform-bench-'));

  const startRaw = performance.now();
  const crawlerRaw = new WebCrawler(baseUrlRaw, {
    maxPages: 5,
    delay: 0,
    outputDir: outputDirRaw,
    logLevel: 'quiet',
    raw: true,
  });
  await crawlerRaw.crawl();
  const endRaw = performance.now();

  await serverRaw.stop();
  await rm(outputDirRaw, { recursive: true, force: true });

  results.rawHtml = endRaw - startRaw;

  return results;
}

/**
 * Run all crawl benchmarks
 */
export async function runAll() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Web Crawling Performance Benchmarks  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('=== Overall Crawl Performance ===\n');
  const overall = await benchmarkOverall();
  console.log(`Total time: ${overall.duration.toFixed(2)}ms`);
  console.log(`Average per page: ${overall.avgPerPage.toFixed(2)}ms`);
  console.log(`Throughput: ${overall.pagesPerSecond.toFixed(2)} pages/sec`);
  console.log(`Pages crawled: ${overall.pagesCrawled}`);
  console.log(`Success rate: ${overall.successCount}/${overall.pagesCrawled}\n`);

  console.log('=== Crawl Concurrency Benchmark ===\n');
  const concurrency = await benchmarkConcurrency();
  for (const [level, stats] of Object.entries(concurrency)) {
    console.log(
      `Concurrency ${level}: ${stats.avgPerPage.toFixed(2)}ms (${stats.pagesPerSecond.toFixed(2)} pages/sec)`
    );
  }

  console.log('\n=== File I/O Benchmark ===\n');
  const fileIO = await benchmarkFileIO();
  console.log(`Markdown: ${fileIO.markdown.toFixed(2)}ms`);
  console.log(`Raw HTML: ${fileIO.rawHtml.toFixed(2)}ms`);

  console.log('\n=== Summary ===\n');
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Overall throughput: ${overall.pagesPerSecond.toFixed(2)} pages/sec`);

  // Find best concurrency
  let bestConcurrency = 1;
  let bestThroughput = concurrency[1].pagesPerSecond;
  for (const [level, stats] of Object.entries(concurrency)) {
    if (stats.pagesPerSecond > bestThroughput) {
      bestThroughput = stats.pagesPerSecond;
      bestConcurrency = level;
    }
  }
  console.log(`Best concurrency: ${bestConcurrency}\n`);

  return {
    overall,
    concurrency,
    fileIO,
    metadata: {
      platform: process.platform,
      arch: process.arch,
      bunVersion: Bun.version,
    },
  };
}

// Run if called directly
if (import.meta.main) {
  await runAll();
}
