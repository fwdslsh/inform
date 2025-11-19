# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING**: Increased default delay from 300ms to 1000ms to align with documentation and promote responsible crawling practices
  - This change reduces load on target servers and aligns with ethical web scraping guidelines
  - Users who need faster crawling can still use `--delay 300` or lower values
  - The new default matches what was documented in README.md

### Added

- Comprehensive Development section in README.md with setup instructions
- Development workflow documentation including testing and building
- Project structure overview in documentation
- Fixed Dependencies section in README.md (removed outdated jsdom reference)
- **JSDoc documentation coverage** - Complete API documentation for all classes
  - Added JSDoc comments to all public methods in WebCrawler
  - Added JSDoc comments to GitCrawler constructor
  - Added JSDoc comments to RobotsParser constructor
  - Includes parameter types, return types, and descriptions
  - Example usage for complex methods (generateFilepath)
  - Ready for API documentation generation with TypeDoc or similar
- **CONTRIBUTING.md** - Comprehensive contribution guidelines
  - Development setup and workflow instructions
  - Code style guidelines with examples
  - Testing requirements and best practices
  - Pull request submission process
  - Issue reporting templates
  - Commit message format conventions
  - Linked from README.md
- **Dependabot configuration** - Automated dependency updates
  - Weekly checks for npm package updates
  - Weekly checks for GitHub Actions updates
  - Grouped patch and minor updates to reduce PR noise
  - Automatic labeling for dependency PRs
  - Configured in `.github/dependabot.yml`
- **robots.txt support** - Automatic fetching and respecting of robots.txt files
  - Fetches and parses robots.txt before crawling
  - Respects Disallow directives for "Inform/1.0" user agent and "*" wildcard
  - Respects Crawl-delay directive (overrides --delay if higher)
  - Logs blocked URLs when robots.txt prevents access
  - Caches robots.txt per domain for efficiency
  - Handles missing robots.txt gracefully
  - `--ignore-robots` flag to bypass (use with caution)
  - Only applies to web mode, not Git downloads
- **Network retry logic with exponential backoff** - Automatic retry of failed requests
  - Retry on network errors (ETIMEDOUT, ECONNRESET, etc.)
  - Retry on server errors (429, 500, 502, 503, 504)
  - Do NOT retry on client errors (4xx except 429)
  - Exponential backoff: 1s, 2s, 4s
  - Configurable via `--max-retries` option (default: 3)
  - Clear retry logging with attempt count and delay
  - Works for both web crawling and Git repository downloads
- **GitHub API token authentication** - Support for GITHUB_TOKEN environment variable
  - Increases rate limit from 60 to 5,000 requests/hour
  - Enables access to private repositories
  - Automatically detected and used when available
  - Fully backwards compatible (works without token)
  - Documented in README.md and docs/github-integration.md
- **Error aggregation and summary reporting** - Crawls now display success/failure counts at completion
  - Track successful and failed pages/files separately
  - Display detailed failure list with error messages
  - Exit with code 1 if any failures occur (configurable)
  - New `--ignore-errors` flag to exit with code 0 despite failures
  - Works for both web crawling and Git repository downloads
- **Queue size limit with warning** - Prevent unbounded memory growth during large crawls
  - Default limit of 10,000 URLs in queue
  - Warning displayed when limit is reached
  - Configurable via `--max-queue-size` option
  - Periodic queue size logging (every 1000 URLs)
  - Helpful guidance when limit is hit
- **Verbose and quiet logging modes** - Configurable output verbosity
  - `--verbose` flag for detailed output (retries, blocked URLs, queue status, skipped files)
  - `--quiet` flag for minimal output (errors only, no progress messages)
  - Normal mode (default) shows standard progress and warnings
  - Implemented in both WebCrawler and GitCrawler
  - Mutually exclusive validation (cannot use both --verbose and --quiet)
  - Summary and error messages always shown regardless of log level
- **Integration tests** - End-to-end testing with local test server
  - Created TestServer class using Bun.serve for isolated testing
  - WebCrawler integration tests (7 tests): multi-page crawling, link following, robots.txt, directory structure, markdown conversion, raw HTML mode, success/failure tracking
  - GitCrawler integration tests (4 tests): GitHub repository downloads, include patterns, subdirectory downloads, success tracking
  - All tests isolated (no external network calls for WebCrawler tests)
  - Fast execution (~7 seconds for all 11 integration tests)
  - Added to test suite alongside existing 52 unit tests
- **Code refactoring** - Improved code maintainability by breaking down complex methods
  - Refactored `WebCrawler.extractContentWithHTMLRewriter()` from 113 lines to 26 lines
  - Extracted 6 focused helper methods for single responsibilities
  - Better separation of concerns for HTML parsing, content extraction, and link processing
  - All functionality preserved with zero behavioral changes
  - All 52 tests continue to pass
- **Performance benchmarks** - Comprehensive benchmark suite for tracking performance over time
  - Crawl benchmarks: overall throughput (7.09 pages/sec), concurrency testing (1-10 concurrent requests), file I/O performance
  - HTML parsing benchmarks: small (0.145ms), medium (0.298ms), large (1.610ms) pages
  - Markdown conversion benchmarks: 1.161ms per conversion (861 conversions/sec)
  - Baseline measurements documented on Linux x64 with Bun v1.2.19
  - CLI commands: `bun run bench`, `bun run bench:save`, `bun run bench:crawl`, `bun run bench:parsing`
  - JSON output support for CI/CD integration
  - Comprehensive documentation in benchmarks/README.md

### Fixed

- Documentation now correctly lists only current dependencies (turndown, minimatch)
- Resolved inconsistency between code default (300ms) and documented default (1000ms)
- **CRITICAL**: Removed `process.exit()` calls from library code (WebCrawler, GitCrawler)
  - Library code was terminating the entire Node process, killing test runners
  - Moved exit logic to CLI layer (src/cli.js) where it belongs
  - Tests now run without crashing the session
  - Proper separation of concerns: libraries return results, CLI handles process termination
- **URL fragment handling**: URLs with different fragments now correctly treated as same page
  - Fixed duplicate crawling of URLs like `/page#section1` and `/page#section2`
  - Strips URL hash in constructor and processFoundLink method
  - Prevents wasted bandwidth and storage
- **maxPages=0 handling**: Setting maxPages to 0 now works correctly
  - Previously defaulted to 100 due to falsy `||` operator check
  - Now uses `!== undefined` for proper boundary condition handling
- **maxPages off-by-one error**: Crawler now respects exact maxPages limit
  - Previously crawled maxPages+1 due to not accounting for activePromises
  - Fixed concurrency logic to check `(visited.size + activePromises.size) < maxPages`
  - Ensures accurate crawl limits even with concurrent requests
- **Link extraction**: Links now extracted from all pages regardless of structure
  - Previously only extracted links from pages with `<main>`, `<article>`, or `.content` elements
  - Pages without explicit main content markers had zero links discovered
  - Now extracts all links for crawling (content filtering separate from link discovery)
  - Significantly improves crawl coverage across diverse page structures

## [0.1.0] - 2025-08-13

### Changed

- **BREAKING**: Replaced jsdom with Bun's native HTMLRewriter for HTML parsing
- **BREAKING**: Removed dependency on jsdom - now fully zero-dependency for HTML processing
- Improved performance with streaming HTML parsing using HTMLRewriter
- Reduced bundle size by eliminating heavy DOM libraries
- Enhanced compilation reliability - no more missing worker file errors

### Added

- Native Bun HTMLRewriter support for efficient HTML processing
- Streaming HTML parsing for better memory efficiency
- Comprehensive test suite for HTMLRewriter implementation

### Removed

- jsdom dependency and all related DOM manipulation methods
- extractMainContent, preserveCodeBlocks, removeUnwantedElements, findLinks methods (replaced with HTMLRewriter approach)

### Fixed

- Compilation errors related to missing jsdom worker files
- Memory efficiency improvements with streaming parsing

### Technical Details

- Uses Bun's built-in `HTMLRewriter` API for HTML processing
- Maintains same CLI interface and functionality
- All existing features preserved with better performance
- Cross-platform binary builds now work without external dependencies

## [0.0.15] - Previous Release

- Last version using jsdom
- Various bug fixes and improvements
