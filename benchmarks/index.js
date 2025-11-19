#!/usr/bin/env bun

import * as crawlBenchmarks from './crawl-benchmark.js';
import * as parsingBenchmarks from './html-parsing-benchmark.js';
import { writeFile } from 'node:fs/promises';

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    saveResults: false,
    outputFile: 'benchmark-results.json',
    showHelp: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--save':
        options.saveResults = true;
        break;
      case '--output':
        if (i + 1 < args.length) {
          options.outputFile = args[++i];
        } else {
          console.error('Error: --output requires a filename');
          process.exit(1);
        }
        break;
      case '--help':
      case '-h':
        options.showHelp = true;
        break;
      default:
        console.error(`Unknown option: ${arg}`);
        console.error('Use --help for usage information');
        process.exit(1);
    }
  }

  return options;
}

/**
 * Show help message
 */
function showHelp() {
  console.log(`
Inform Performance Benchmark Suite

Usage: bun benchmarks/index.js [options]

Options:
  --save              Save results to JSON file
  --output <file>     Specify output filename (default: benchmark-results.json)
  --help, -h          Show this help message

Examples:
  bun benchmarks/index.js                    # Run all benchmarks
  bun benchmarks/index.js --save             # Run and save results
  bun benchmarks/index.js --save --output results.json

Individual Benchmarks:
  bun benchmarks/crawl-benchmark.js          # Web crawling benchmarks
  bun benchmarks/html-parsing-benchmark.js   # HTML parsing benchmarks
`);
}

/**
 * Calculate total benchmark execution time from individual benchmark results
 * 
 * Sums the following components:
 * - Web crawl benchmark duration (overall.duration)
 * - Markdown conversion total time (markdown.totalTime)
 * - Small HTML parsing total time (avgPerParse × iterations)
 * - Medium HTML parsing total time (avgPerParse × iterations)
 * - Large HTML parsing total time (avgPerParse × iterations)
 * 
 * @param {Object} results - The benchmark results object
 * @param {Object} results.crawl - Crawl benchmark results
 * @param {Object} results.crawl.overall - Overall crawl statistics
 * @param {number} results.crawl.overall.duration - Crawl duration in milliseconds
 * @param {Object} results.parsing - Parsing benchmark results
 * @param {Object} results.parsing.markdown - Markdown conversion results
 * @param {number} results.parsing.markdown.totalTime - Total markdown conversion time in milliseconds
 * @param {Object} results.parsing.sizes - HTML parsing size results
 * @param {Object} results.parsing.sizes.small - Small HTML parsing results
 * @param {number} results.parsing.sizes.small.avgPerParse - Average parse time in milliseconds
 * @param {number} results.parsing.sizes.small.iterations - Number of iterations
 * @param {Object} results.parsing.sizes.medium - Medium HTML parsing results
 * @param {number} results.parsing.sizes.medium.avgPerParse - Average parse time in milliseconds
 * @param {number} results.parsing.sizes.medium.iterations - Number of iterations
 * @param {Object} results.parsing.sizes.large - Large HTML parsing results
 * @param {number} results.parsing.sizes.large.avgPerParse - Average parse time in milliseconds
 * @param {number} results.parsing.sizes.large.iterations - Number of iterations
 * @returns {number} Total benchmark time in seconds
 */
function calculateTotalBenchmarkTime(results) {
  const crawlTime = results.crawl.overall.duration;
  const markdownTime = results.parsing.markdown.totalTime;
  const smallParsingTime = results.parsing.sizes.small.avgPerParse * results.parsing.sizes.small.iterations;
  const mediumParsingTime = results.parsing.sizes.medium.avgPerParse * results.parsing.sizes.medium.iterations;
  const largeParsingTime = results.parsing.sizes.large.avgPerParse * results.parsing.sizes.large.iterations;
  
  const totalMilliseconds = crawlTime + markdownTime + smallParsingTime + mediumParsingTime + largeParsingTime;
  const totalSeconds = totalMilliseconds / 1000;
  
  return totalSeconds;
}

/**
 * Run all benchmarks
 */
async function runAllBenchmarks(options = {}) {
  const { saveResults = false, outputFile = 'benchmark-results.json' } = options;

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║  Inform Performance Benchmark Suite         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  const results = {
    metadata: {
      timestamp: new Date().toISOString(),
      bunVersion: Bun.version,
      platform: process.platform,
      arch: process.arch,
    },
  };

  // Run crawl benchmarks
  console.log('[1/2] Running web crawling benchmarks...');
  results.crawl = await crawlBenchmarks.runAll();

  // Run parsing benchmarks
  console.log('[2/2] Running HTML parsing benchmarks...');
  results.parsing = await parsingBenchmarks.runAll();

  // Save results if requested
  if (saveResults) {
    await writeFile(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n✓ Results saved to ${outputFile}`);
  }

  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  Benchmark Suite Complete                   ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Calculate total time from individual benchmarks
  const totalTime = calculateTotalBenchmarkTime(results);

  console.log(`Total benchmark time: ${totalTime.toFixed(2)}s\n`);
  console.log('Key Metrics:');
  console.log(
    `  • Crawl throughput: ${results.crawl.overall.pagesPerSecond.toFixed(2)} pages/sec`
  );
  console.log(
    `  • HTML parsing (small): ${results.parsing.sizes.small.avgPerParse.toFixed(3)}ms`
  );
  console.log(
    `  • HTML parsing (medium): ${results.parsing.sizes.medium.avgPerParse.toFixed(3)}ms`
  );
  console.log(
    `  • HTML parsing (large): ${results.parsing.sizes.large.avgPerParse.toFixed(3)}ms`
  );
  console.log(
    `  • Markdown conversion: ${results.parsing.markdown.avgPerConversion.toFixed(3)}ms\n`
  );

  return results;
}

// Main entry point
if (import.meta.main) {
  const options = parseArgs();

  if (options.showHelp) {
    showHelp();
    process.exit(0);
  }

  await runAllBenchmarks(options);
}

export { runAllBenchmarks };
