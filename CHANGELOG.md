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

### Fixed

- Documentation now correctly lists only current dependencies (turndown, minimatch)
- Resolved inconsistency between code default (300ms) and documented default (1000ms)

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
