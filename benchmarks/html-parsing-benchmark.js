import { WebCrawler } from '../src/WebCrawler.js';
import TurndownService from 'turndown';
import { tmpdir } from 'node:os';

/**
 * Generate HTML of different sizes for benchmarking
 */
function generateHTML(size) {
  const sizes = {
    small: {
      title: 'Small Page',
      paragraphs: 5,
      links: 3,
    },
    medium: {
      title: 'Medium Page',
      paragraphs: 50,
      links: 20,
    },
    large: {
      title: 'Large Page',
      paragraphs: 500,
      links: 100,
    },
  };

  const config = sizes[size];
  let html = `<!DOCTYPE html>
<html>
<head><title>${config.title}</title></head>
<body>
  <h1>${config.title}</h1>
  <nav>`;

  for (let i = 0; i < config.links; i++) {
    html += `\n    <a href="/link${i}">Link ${i}</a>`;
  }

  html += '\n  </nav>\n  <main>';

  for (let i = 0; i < config.paragraphs; i++) {
    html += `\n    <p>This is paragraph ${i} with some sample content for benchmarking HTML parsing performance.</p>`;
  }

  html += '\n  </main>\n</body>\n</html>';

  return html;
}

/**
 * Benchmark HTML parsing with different sizes
 */
async function benchmarkHTMLSizes() {
  const results = {};
  const sizes = ['small', 'medium', 'large'];
  const iterations = { small: 1000, medium: 1000, large: 100 };

  for (const size of sizes) {
    const html = generateHTML(size);
    const htmlSize = new TextEncoder().encode(html).length;
    const crawler = new WebCrawler('http://example.com', {
      logLevel: 'quiet',
    });

    const startTime = performance.now();
    for (let i = 0; i < iterations[size]; i++) {
      await crawler.extractContentWithHTMLRewriter(html, 'http://example.com');
    }
    const endTime = performance.now();

    const totalTime = endTime - startTime;
    const avgPerParse = totalTime / iterations[size];
    const parsesPerSecond = (iterations[size] / totalTime) * 1000;

    results[size] = {
      avgPerParse,
      parsesPerSecond,
      iterations: iterations[size],
      htmlSize,
    };
  }

  return results;
}

/**
 * Benchmark specific parsing operations
 */
async function benchmarkParsingOperations() {
  const testHTML = generateHTML('medium');
  const iterations = 100;
  const crawler = new WebCrawler('http://example.com', {
    logLevel: 'quiet',
  });

  // Benchmark content extraction
  const startExtract = performance.now();
  for (let i = 0; i < iterations; i++) {
    await crawler.extractContentWithHTMLRewriter(testHTML, 'http://example.com');
  }
  const endExtract = performance.now();
  const extractTime = (endExtract - startExtract) / iterations;

  // Benchmark link extraction
  const startLinks = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = await crawler.extractContentWithHTMLRewriter(
      testHTML,
      'http://example.com'
    );
    result.links; // Access links
  }
  const endLinks = performance.now();
  const linksTime = (endLinks - startLinks) / iterations;

  // Benchmark code preservation
  const htmlWithCode = `<!DOCTYPE html>
<html>
<head><title>Code Test</title></head>
<body>
  <pre><code>const x = 1;
const y = 2;</code></pre>
  <p>Regular content</p>
</body>
</html>`;

  const startCode = performance.now();
  for (let i = 0; i < iterations; i++) {
    await crawler.extractContentWithHTMLRewriter(
      htmlWithCode,
      'http://example.com'
    );
  }
  const endCode = performance.now();
  const codeTime = (endCode - startCode) / iterations;

  return {
    contentExtraction: {
      avgPerOp: extractTime,
      opsPerSecond: (1 / extractTime) * 1000,
    },
    linkExtraction: {
      avgPerOp: linksTime,
      opsPerSecond: (1 / linksTime) * 1000,
    },
    codePreservation: {
      avgPerOp: codeTime,
      opsPerSecond: (1 / codeTime) * 1000,
    },
  };
}

/**
 * Benchmark markdown conversion performance
 */
async function benchmarkMarkdownConversion() {
  const testHTML = generateHTML('medium');
  const iterations = 500;
  const crawler = new WebCrawler('http://example.com', {
    logLevel: 'quiet',
  });
  const turndown = new TurndownService({
    headingStyle: 'atx',
    codeBlockStyle: 'fenced',
  });

  const startTime = performance.now();
  for (let i = 0; i < iterations; i++) {
    const result = await crawler.extractContentWithHTMLRewriter(
      testHTML,
      'http://example.com'
    );
    turndown.turndown(result.html);
  }
  const endTime = performance.now();

  const totalTime = endTime - startTime;
  const avgPerConversion = totalTime / iterations;
  const conversionsPerSecond = (iterations / totalTime) * 1000;

  return {
    avgPerConversion,
    conversionsPerSecond,
    totalTime,
    iterations,
  };
}

/**
 * Run all HTML parsing benchmarks
 */
export async function runAll() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  HTML Parsing Performance Benchmarks  ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log('=== HTML Parsing Size Benchmark ===\n');
  const sizes = await benchmarkHTMLSizes();
  for (const [size, stats] of Object.entries(sizes)) {
    const sizeKB = (stats.htmlSize / 1024).toFixed(2);
    console.log(
      `${size.padEnd(8)} (${sizeKB} KB): ${stats.avgPerParse.toFixed(3)}ms/parse (${Math.round(stats.parsesPerSecond)} parses/sec, ${stats.iterations} iterations)`
    );
  }

  console.log('\n=== HTML Parsing Operations Benchmark ===\n');
  const operations = await benchmarkParsingOperations();
  console.log(
    `Content Extraction: ${operations.contentExtraction.avgPerOp.toFixed(3)}ms/op (${Math.round(operations.contentExtraction.opsPerSecond)} ops/sec)`
  );
  console.log(
    `Link Extraction: ${operations.linkExtraction.avgPerOp.toFixed(3)}ms/op (${Math.round(operations.linkExtraction.opsPerSecond)} ops/sec)`
  );
  console.log(
    `Code Preservation: ${operations.codePreservation.avgPerOp.toFixed(3)}ms/op (${Math.round(operations.codePreservation.opsPerSecond)} ops/sec)`
  );

  console.log('\n=== Markdown Conversion Benchmark ===\n');
  const markdown = await benchmarkMarkdownConversion();
  console.log(`Average per conversion: ${markdown.avgPerConversion.toFixed(3)}ms`);
  console.log(
    `Throughput: ${Math.round(markdown.conversionsPerSecond)} conversions/sec`
  );
  console.log(
    `Total time: ${markdown.totalTime.toFixed(2)}ms (${markdown.iterations} iterations)`
  );

  console.log('\n=== Summary ===\n');
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Bun version: ${Bun.version}`);
  console.log(`Small HTML parsing: ${sizes.small.avgPerParse.toFixed(3)}ms/parse`);
  console.log(
    `Medium HTML parsing: ${sizes.medium.avgPerParse.toFixed(3)}ms/parse`
  );
  console.log(`Large HTML parsing: ${sizes.large.avgPerParse.toFixed(3)}ms/parse`);
  console.log(
    `Markdown conversion: ${markdown.avgPerConversion.toFixed(3)}ms/conversion\n`
  );

  return {
    sizes,
    operations,
    markdown,
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
