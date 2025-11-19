# Inform - Action Plan & Status Tracker

**Document Version:** 1.6
**Last Updated:** 2025-11-19 (Updated after completing HP-1, HP-2, HP-3, MP-4, MP-5, MP-3, MP-2, MP-1)
**Based On:** Pre-Production Release Review v0.1.4
**Project:** @fwdslsh/inform

---

## Overview

This document outlines all actionable tasks identified in the pre-production release review. Tasks are organized by priority and include detailed acceptance criteria, estimated effort, and tracking status.

**Review Summary:**
- Production Readiness: 8.5/10
- Current Status: READY FOR PRODUCTION with recommendations
- Total Issues Identified: 15
- Critical Issues: 0
- High Priority: 3
- Medium Priority: 5
- Low Priority: 7

---

## Task Summary Dashboard

| Priority | Total | Completed | In Progress | Not Started |
|----------|-------|-----------|-------------|-------------|
| High     | 3     | 3         | 0           | 0           |
| Medium   | 5     | 5         | 0           | 0           |
| Low      | 7     | 0         | 0           | 7           |
| **Total**| **15**| **8**     | **0**       | **7**       |

**Recent Progress:**
- ✅ HP-1: Dependency installation documentation added to README.md
- ✅ HP-2: Default delay updated from 300ms to 1000ms
- ✅ HP-3: Package.json metadata fields added (author, repository, bugs, homepage)
- ✅ MP-4: Error aggregation and summary reporting implemented
- ✅ MP-5: Queue size limit with warning to prevent memory issues
- ✅ MP-3: GitHub API token authentication for increased rate limits
- ✅ MP-2: Network retry logic with exponential backoff for reliability
- ✅ MP-1: robots.txt support for ethical web crawling

---

## High Priority Tasks (Pre-Release)

These tasks should be completed before the next production release.

### HP-1: Add Dependency Installation Documentation

**Priority:** 🔴 High
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 15 minutes
**Assignee:** Claude
**Completed:** 2025-11-19

**Description:**
The project requires dependencies to be installed before tests can run, but this step is not documented. New contributors encounter test failures without knowing why.

**Current Behavior:**
```bash
$ git clone ...
$ cd inform
$ bun test
# Error: Cannot find package 'minimatch'
```

**Expected Behavior:**
```bash
$ git clone ...
$ cd inform
$ bun install  # Documented step
$ bun test     # All tests pass
```

**Files to Modify:**
- `README.md` - Add development setup section
- Consider adding to `docs/getting-started.md`

**Acceptance Criteria:**
- [x] README.md includes "Development" section
- [x] Section includes `bun install` command
- [x] Section appears in logical location (after Dependencies, before Ethical Use)
- [x] Development workflow is clear: clone → install → test → develop
- [x] Additional: Added project structure overview, build instructions, and contributing guidelines
- [x] Fixed: Updated Dependencies section to remove outdated jsdom reference

**Proposed Changes:**
```markdown
## Development

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/fwdslsh/inform.git
   cd inform
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Run tests to verify setup:
   ```bash
   bun test
   ```

4. Build the project:
   ```bash
   bun run build
   ```

### Running Tests

```bash
bun test                # Run all tests
bun test --watch       # Watch mode
```
```

---

### HP-2: Resolve Default Delay Discrepancy

**Priority:** 🔴 High
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 30 minutes
**Assignee:** Claude
**Completed:** 2025-11-19
**Decision:** Option A - Updated code to 1000ms

**Description:**
The code and documentation specify different default values for the delay between requests. This creates confusion about the actual behavior.

**Current State:**
- Code (`src/WebCrawler.js:12`): `this.delay = options.delay || 300`
- Documentation (`README.md:122`): "Delay between requests in milliseconds (default: 1000)"

**Decision Required:**
Choose one of the following:

**Option A: Update Code to Match Documentation (1000ms)**
- More conservative (better for being a "good citizen")
- Less aggressive on target servers
- Breaking change for existing users relying on 300ms default

**Option B: Update Documentation to Match Code (300ms)**
- No code changes required
- Faster default crawling
- Already deployed behavior

**Recommendation:** Option A (Update code to 1000ms)
- More responsible default
- Better aligns with ethical crawling practices
- Mentioned in README.md:245 "Use reasonable rate limits"

**Files to Modify:**
- `src/WebCrawler.js` - Update default delay value
- OR `README.md` - Update documentation
- `src/cli.js` - Update help text if needed

**Acceptance Criteria:**
- [x] Code and documentation specify the same default value (1000ms)
- [x] Help text already correctly states "default: 1000" in README
- [x] Decision documented in CHANGELOG.md with [Unreleased] section
- [x] Breaking change noted in CHANGELOG with rationale
- [x] Tests updated and passing (52/52 tests pass)
- [x] src/WebCrawler.js updated: `this.delay = options.delay || 1000`
- [x] tests/cli.test.js updated: expectation changed from 300 to 1000

**Proposed Code Change (Option A):**
```javascript
// src/WebCrawler.js:12
this.delay = options.delay || 1000; // Default delay of 1000ms (was 300ms)
```

**Proposed Changelog Entry:**
```markdown
## [0.1.5] - TBD

### Changed
- Increased default delay from 300ms to 1000ms to match documentation and promote responsible crawling
- This aligns with ethical web scraping practices and reduces load on target servers
```

---

### HP-3: Add Package.json Metadata Fields

**Priority:** 🔴 High
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 10 minutes
**Assignee:** Claude
**Completed:** 2025-11-19

**Description:**
The package.json is missing important metadata fields that improve discoverability on NPM and provide users with important project information.

**Current State:**
Missing fields:
- `author`
- `repository`
- `bugs`
- `homepage`

**Impact:**
- Lower discoverability on NPM
- Users can't easily find source code or report issues
- Less professional appearance on NPM registry

**Files to Modify:**
- `package.json`

**Acceptance Criteria:**
- [x] `author` field is populated ("fwdslsh")
- [x] `repository` field points to GitHub repo (git+https://github.com/fwdslsh/inform.git)
- [x] `bugs` field points to GitHub issues (https://github.com/fwdslsh/inform/issues)
- [x] `homepage` field points to README (https://github.com/fwdslsh/inform#readme)
- [x] All fields follow NPM package.json conventions
- [x] Package.json remains valid JSON
- [x] Tests still pass after changes

**Proposed Changes:**
```json
{
  "name": "@fwdslsh/inform",
  "version": "0.1.4",
  "description": "A high-performance web crawler powered by Bun that downloads pages and converts them to Markdown",
  "author": "fwdslsh",
  "license": "CC-BY-4.0",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/fwdslsh/inform.git"
  },
  "bugs": {
    "url": "https://github.com/fwdslsh/inform/issues"
  },
  "homepage": "https://github.com/fwdslsh/inform#readme",
  "keywords": [
    "crawler",
    "web-scraping",
    "markdown",
    "cli",
    "bun",
    "performance"
  ]
}
```

---

## Medium Priority Tasks (Post-Release)

These tasks should be completed in the next 1-2 releases after production deployment.

### MP-1: Add robots.txt Support

**Priority:** 🟡 Medium
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 3 hours
**Assignee:** Claude
**Completed:** 2025-11-19

**Description:**
Currently, Inform does not check or respect robots.txt files. This could lead to violating site policies and crawling restricted areas.

**Implemented Solution:**
Created RobotsParser class with full robots.txt support including parsing, caching, and URL filtering.

**Files Modified:**
- `src/RobotsParser.js` - New file with complete robots.txt parser
- `src/WebCrawler.js` - Integrated robots.txt fetching and checking
- `src/cli.js` - Added `--ignore-robots` flag
- `README.md` - Documented robots.txt behavior and --ignore-robots flag
- `CHANGELOG.md` - Documented new feature

**Acceptance Criteria:**
- [x] Fetch and parse robots.txt before crawling
- [x] Respect Disallow directives (with prefix and wildcard matching)
- [x] Respect Crawl-delay directive (overrides --delay if higher)
- [x] Respect User-agent specific rules ("Inform/1.0" and "*" wildcard)
- [x] Add `--ignore-robots` flag to bypass (with warning message)
- [x] Log when robots.txt blocks a URL ("Blocked by robots.txt: ...")
- [x] Cache robots.txt per domain (Map-based caching)
- [x] Handle missing robots.txt gracefully (allows everything, logs status)
- [x] All existing tests pass (52/52)
- [x] Update documentation in README.md and CHANGELOG.md

**Implementation Notes:**
```javascript
// Pseudo-code structure
class RobotsParser {
  constructor(userAgent = 'Inform/1.0') {
    this.userAgent = userAgent;
    this.rules = new Map(); // Cache per domain
  }

  async fetch(baseUrl) {
    const robotsUrl = new URL('/robots.txt', baseUrl);
    // Fetch and parse robots.txt
  }

  isAllowed(url) {
    // Check against parsed rules
  }

  getCrawlDelay() {
    // Return crawl delay if specified
  }
}
```

**Configuration Options:**
```bash
# Respect robots.txt (default)
inform https://example.com

# Ignore robots.txt (with warning)
inform https://example.com --ignore-robots

# Custom user agent
inform https://example.com --user-agent "MyBot/1.0"
```

---

### MP-2: Implement Network Retry Logic

**Priority:** 🟡 Medium
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 2.5 hours
**Assignee:** Claude
**Completed:** 2025-11-19

**Description:**
Network failures are not retried, causing transient errors to result in missing pages. Add exponential backoff retry logic for resilience.

**Current Behavior:**
```javascript
// src/WebCrawler.js:111
const response = await fetch(url);
// If this fails, page is skipped permanently
```

**Implemented Behavior:**
```javascript
const response = await this.fetchWithRetry(url, {
  headers: { ... }
});
// Automatically retries with exponential backoff: 1s, 2s, 4s
```

**Files Modified:**
- `src/WebCrawler.js` - Added fetchWithRetry method and maxRetries property
- `src/GitCrawler.js` - Added fetchWithRetry method and maxRetries property
- `src/cli.js` - Added `--max-retries` option with validation
- `README.md` - Documented --max-retries option
- `CHANGELOG.md` - Documented new feature

**Acceptance Criteria:**
- [x] Retry on network errors (ETIMEDOUT, ECONNRESET, etc.)
- [x] Retry on 5xx server errors (500, 502, 503, 504)
- [x] Retry on 429 (rate limit)
- [x] Do NOT retry on 4xx client errors (except 429)
- [x] Exponential backoff: 1s, 2s, 4s
- [x] Configurable max retries (default: 3)
- [x] Log retry attempts with clear messages showing attempt number and delay
- [x] Add `--max-retries` CLI option
- [x] All existing tests pass (52/52)
- [x] Update documentation

**Implementation:**
```javascript
async function fetchWithRetry(url, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const retryableStatus = new Set([429, 500, 502, 503, 504]);

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options.fetchOptions);

      if (response.ok || !retryableStatus.has(response.status)) {
        return response;
      }

      // Server error, retry
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.log(`Retry ${attempt + 1}/${maxRetries} for ${url} after ${delay}ms`);
        await Bun.sleep(delay);
      }
    } catch (error) {
      // Network error
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Network error, retry ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await Bun.sleep(delay);
      } else {
        throw error;
      }
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}
```

---

### MP-3: Add GitHub API Token Authentication

**Priority:** 🟡 Medium
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 2 hours
**Assignee:** Claude
**Completed:** 2025-11-19

**Description:**
GitHub's public API is limited to 60 requests/hour. Add support for authentication to increase limit to 5,000 requests/hour.

**Current Limitation:**
- Unauthenticated: 60 requests/hour
- Authenticated: 5,000 requests/hour

**Files Modified:**
- `src/GitCrawler.js` - Added authorization header support
- `README.md` - Documented GITHUB_TOKEN usage
- `docs/github-integration.md` - Added comprehensive authentication section
- `CHANGELOG.md` - Documented new feature

**Acceptance Criteria:**
- [x] Read GITHUB_TOKEN from environment variable
- [x] Add Authorization header when token is present
- [x] Work without token (backwards compatible)
- [x] Log whether using authenticated mode
- [x] Handle token validation errors gracefully (GitHub API will return appropriate errors)
- [x] Update documentation with token setup instructions
- [x] No security issue: Token value is never logged, only "Using GitHub API token for authentication" message
- [x] Support both personal access tokens and fine-grained tokens (uses Bearer authentication)

**Implementation:**
```javascript
// src/GitCrawler.js
async downloadDirectory(path) {
  const headers = {
    'User-Agent': 'Inform-GitCrawler/1.0',
    'Accept': 'application/vnd.github.v3+json'
  };

  // Add authentication if token is available
  const githubToken = process.env.GITHUB_TOKEN;
  if (githubToken) {
    headers['Authorization'] = `Bearer ${githubToken}`;
    console.log('Using authenticated GitHub API (higher rate limits)');
  } else {
    console.log('Using unauthenticated GitHub API (60 requests/hour limit)');
  }

  const response = await fetch(apiUrl, { headers });
  // ...
}
```

**Documentation Addition:**
```markdown
## GitHub API Authentication

To increase API rate limits from 60 to 5,000 requests/hour:

1. Create a GitHub personal access token:
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token (classic)
   - No scopes needed for public repositories

2. Set the environment variable:
   ```bash
   export GITHUB_TOKEN="ghp_your_token_here"
   ```

3. Run inform as usual:
   ```bash
   inform https://github.com/owner/repo
   ```

Inform will automatically use the token if present.
```

---

### MP-4: Add Error Aggregation Summary

**Priority:** 🟡 Medium
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 1.5 hours
**Assignee:** Claude
**Completed:** 2025-11-19

**Description:**
Currently, errors are logged individually but there's no summary at the end. Users can't easily see which pages failed or why.

**Current Behavior:**
```
Crawling: https://example.com/page1
Error crawling https://example.com/page1: HTTP 404
Crawling: https://example.com/page2
  Saved: page2.md (123ms)
...
Crawl complete! Processed 50 pages.
```

**Desired Behavior:**
```
Crawl complete! Processed 50 pages.

Summary:
  ✓ Successful: 48 pages
  ✗ Failed: 2 pages

Failed Pages:
  • https://example.com/page1 - HTTP 404: Not Found
  • https://example.com/page5 - Network timeout
```

**Files to Modify:**
- `src/WebCrawler.js` - Track failures
- `src/GitCrawler.js` - Track failures

**Acceptance Criteria:**
- [x] Track successful and failed pages separately (WebCrawler and GitCrawler)
- [x] Record failure reason for each failed page
- [x] Display summary at end of crawl with displaySummary() method
- [x] Include total, successful, and failed counts
- [x] List failed URLs/files with reasons
- [x] Use clear visual indicators (✓ for success, ✗ for failure)
- [x] Exit with code 1 if any failures
- [x] Add `--ignore-errors` flag to exit 0 anyway
- [x] Implemented for both WebCrawler and GitCrawler
- [x] Added to CLI help text
- [x] Documented in CHANGELOG.md

**Implementation:**
```javascript
class WebCrawler {
  constructor(baseUrl, options = {}) {
    // ...existing code...
    this.failures = new Map(); // url -> error message
    this.successes = new Set();
  }

  async crawlPage(url) {
    try {
      // ...existing code...
      this.successes.add(url);
    } catch (error) {
      this.failures.set(url, error.message);
      console.error(`Error crawling ${url}:`, error.message);
    }
  }

  async crawl() {
    // ...existing crawl logic...

    // Print summary
    console.log(`\nCrawl complete! Processed ${this.visited.size} pages.\n`);
    console.log('Summary:');
    console.log(`  ✓ Successful: ${this.successes.size} pages`);
    console.log(`  ✗ Failed: ${this.failures.size} pages`);

    if (this.failures.size > 0) {
      console.log('\nFailed Pages:');
      for (const [url, error] of this.failures) {
        console.log(`  • ${url} - ${error}`);
      }

      if (!this.options.ignoreErrors) {
        process.exit(1);
      }
    }
  }
}
```

---

### MP-5: Add Queue Size Limit/Warning

**Priority:** 🟡 Medium
**Status:** ✅ Completed (2025-11-19)
**Actual Effort:** 1 hour
**Assignee:** Claude
**Completed:** 2025-11-19

**Description:**
The `toVisit` Set can grow unbounded for sites with many internal links, potentially causing memory issues.

**Current Risk:**
- Large site with 100,000 internal links
- All links queued in memory
- Potential out-of-memory crash

**Proposed Solution:**
Add configurable max queue size with warning when exceeded.

**Files to Modify:**
- `src/WebCrawler.js`
- `src/cli.js` - Add `--max-queue-size` option

**Acceptance Criteria:**
- [x] Add `maxQueueSize` option (default: 10,000)
- [x] Warning when queue size exceeds threshold
- [x] Continue with warning (skips new links when limit reached)
- [x] Log queue size periodically (every 1000 URLs)
- [x] Document memory implications in warning message
- [x] Add CLI option `--max-queue-size`
- [x] Added to CLI help text
- [x] Tests pass
- [x] Documented in CHANGELOG.md

**Implementation:**
```javascript
processFoundLink(href, currentUrl) {
  // ...existing validation...

  if (this.toVisit.size >= this.maxQueueSize) {
    console.warn(`Warning: Queue size limit reached (${this.maxQueueSize}). Skipping new links.`);
    return;
  }

  this.toVisit.add(absoluteUrl);

  // Periodic warning
  if (this.toVisit.size % 1000 === 0) {
    console.log(`Queue size: ${this.toVisit.size} URLs pending`);
  }
}
```

---

## Low Priority Tasks (Future Enhancements)

These tasks improve the project but are not critical for production use.

### LP-1: Add JSDoc Coverage to WebCrawler and FileFilter

**Priority:** 🟢 Low
**Status:** ❌ Not Started
**Estimated Effort:** 2 hours
**Assignee:** TBD
**Target Completion:** v0.3.0

**Description:**
GitCrawler and GitUrlParser have good JSDoc coverage, but WebCrawler and FileFilter lack documentation comments.

**Files to Modify:**
- `src/WebCrawler.js` - Add JSDoc to all public methods
- `src/FileFilter.js` - Add JSDoc to all public methods

**Acceptance Criteria:**
- [ ] All public methods have JSDoc comments
- [ ] JSDoc includes description, params, and returns
- [ ] Complex methods have example usage
- [ ] Internal methods have brief comments
- [ ] Consider generating API docs with TypeDoc or similar

**Example:**
```javascript
/**
 * Extract main content from HTML using Bun's HTMLRewriter
 * @param {string} html - The HTML content to parse
 * @param {string} currentUrl - The URL of the current page (for resolving relative links)
 * @returns {Promise<{html: string, links: string[]}>} Extracted content and found links
 */
async extractContentWithHTMLRewriter(html, currentUrl) {
  // ...
}
```

---

### LP-2: Create CONTRIBUTING.md

**Priority:** 🟢 Low
**Status:** ❌ Not Started
**Estimated Effort:** 1 hour
**Assignee:** TBD
**Target Completion:** v0.2.0

**Description:**
No contributing guide exists, making it harder for potential contributors to get started.

**Files to Create:**
- `CONTRIBUTING.md`

**Acceptance Criteria:**
- [ ] File created with contribution guidelines
- [ ] Include development setup instructions
- [ ] Code style guidelines
- [ ] PR process
- [ ] Testing requirements
- [ ] Link from README.md

**Content Sections:**
1. Welcome message
2. Development setup
3. Running tests
4. Code style
5. Submitting PRs
6. Reporting issues
7. Code of conduct reference

---

### LP-3: Set Up Dependabot

**Priority:** 🟢 Low
**Status:** ❌ Not Started
**Estimated Effort:** 30 minutes
**Assignee:** TBD
**Target Completion:** v0.2.0

**Description:**
No automated dependency updates are configured. Dependabot can help keep dependencies current and secure.

**Files to Create:**
- `.github/dependabot.yml`

**Acceptance Criteria:**
- [ ] Dependabot configuration file created
- [ ] Check for updates weekly
- [ ] Separate PRs for npm dependencies
- [ ] Auto-merge patch updates (optional)
- [ ] Group minor/major updates

**Configuration:**
```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automated"
```

---

### LP-4: Add Integration Tests

**Priority:** 🟢 Low
**Status:** ❌ Not Started
**Estimated Effort:** 4-6 hours
**Assignee:** TBD
**Target Completion:** v0.3.0

**Description:**
Current tests are all unit tests. Add integration tests that actually crawl a local test server.

**Approach:**
- Create simple HTTP server serving test HTML
- Test actual crawling end-to-end
- Verify file outputs
- Test error scenarios

**Files to Create:**
- `tests/integration/` directory
- `tests/integration/test-server.js` - Simple HTTP server
- `tests/integration/web-crawler-integration.test.js`
- `tests/integration/git-crawler-integration.test.js`
- `tests/fixtures/` - Test HTML files

**Acceptance Criteria:**
- [ ] Local test server serving static HTML
- [ ] Test crawling multiple pages
- [ ] Test following links
- [ ] Test rate limiting
- [ ] Test concurrent requests
- [ ] Test file output correctness
- [ ] Test error handling (404, 500, timeout)
- [ ] Tests run in CI/CD
- [ ] Tests are isolated (don't hit real websites)

---

### LP-5: Add Performance Benchmarks

**Priority:** 🟢 Low
**Status:** ❌ Not Started
**Estimated Effort:** 3-4 hours
**Assignee:** TBD
**Target Completion:** v0.3.0

**Description:**
No performance benchmarks exist to detect regressions or measure improvements.

**Files to Create:**
- `benchmarks/` directory
- `benchmarks/crawl-benchmark.js`
- `benchmarks/html-parsing-benchmark.js`
- `.github/workflows/benchmark.yml` (optional CI integration)

**Acceptance Criteria:**
- [ ] Benchmark crawling performance (pages/second)
- [ ] Benchmark HTML parsing performance
- [ ] Benchmark file I/O performance
- [ ] Baseline measurements documented
- [ ] Run benchmarks on CI for major releases
- [ ] Compare against previous versions
- [ ] Document results in CHANGELOG

**Example Benchmark:**
```javascript
// benchmarks/crawl-benchmark.js
import { WebCrawler } from '../src/WebCrawler.js';

async function benchmark() {
  const testUrls = [
    // Array of test URLs or local server
  ];

  const startTime = performance.now();
  const crawler = new WebCrawler(testUrl, {
    maxPages: 100,
    delay: 0,
    concurrency: 10
  });
  await crawler.crawl();
  const endTime = performance.now();

  console.log(`Crawled 100 pages in ${endTime - startTime}ms`);
  console.log(`Rate: ${100 / ((endTime - startTime) / 1000)} pages/sec`);
}
```

---

### LP-6: Add Verbose/Quiet Logging Modes

**Priority:** 🟢 Low
**Status:** ❌ Not Started
**Estimated Effort:** 2 hours
**Assignee:** TBD
**Target Completion:** v0.2.0

**Description:**
Add `--verbose` and `--quiet` flags for different logging levels.

**Files to Modify:**
- `src/cli.js` - Add flags
- `src/WebCrawler.js` - Implement log levels
- `src/GitCrawler.js` - Implement log levels

**Acceptance Criteria:**
- [ ] Add `--verbose` flag for detailed logging
- [ ] Add `--quiet` flag for minimal logging
- [ ] Default mode (normal logging)
- [ ] Verbose includes: headers, request details, queue size
- [ ] Quiet only shows: start, end, errors
- [ ] Log levels don't affect error reporting

**Modes:**
```bash
# Quiet mode (only summary)
inform https://example.com --quiet

# Normal mode (current behavior)
inform https://example.com

# Verbose mode (detailed)
inform https://example.com --verbose
```

---

### LP-7: Refactor Long Methods

**Priority:** 🟢 Low
**Status:** ❌ Not Started
**Estimated Effort:** 2-3 hours
**Assignee:** TBD
**Target Completion:** v0.3.0

**Description:**
Some methods exceed 40-50 lines and could be refactored for better maintainability.

**Target Methods:**
1. `WebCrawler.extractContentWithHTMLRewriter()` (113 lines) - src/WebCrawler.js:150-263
2. `GitCrawler.shouldExploreDirectory()` (42 lines) - src/GitCrawler.js:179-221

**Files to Modify:**
- `src/WebCrawler.js`
- `src/GitCrawler.js`

**Acceptance Criteria:**
- [ ] Extract helper methods from long methods
- [ ] Each method has single responsibility
- [ ] No method exceeds 40 lines
- [ ] Tests still pass
- [ ] No behavior changes
- [ ] Code is more readable

**Example Refactoring:**
```javascript
// Before: 113-line method
async extractContentWithHTMLRewriter(html, currentUrl) {
  // ... 113 lines of complex logic
}

// After: Split into focused methods
async extractContentWithHTMLRewriter(html, currentUrl) {
  const rewriter = this.createHTMLRewriter();
  return await this.processHTML(html, rewriter);
}

createHTMLRewriter() {
  const rewriter = new HTMLRewriter();
  this.attachMainContentHandlers(rewriter);
  this.attachUnwantedElementHandlers(rewriter);
  this.attachLinkHandlers(rewriter);
  return rewriter;
}

attachMainContentHandlers(rewriter) {
  // Main content extraction logic
}

attachUnwantedElementHandlers(rewriter) {
  // Unwanted element removal logic
}

attachLinkHandlers(rewriter) {
  // Link extraction logic
}

async processHTML(html, rewriter) {
  // HTML processing logic
}
```

---

## Long-Term Roadmap Items

These are aspirational features for future major versions.

### LT-1: Plugin System for Custom Extractors

**Priority:** 🔵 Roadmap
**Status:** ❌ Not Started
**Estimated Effort:** 1-2 weeks
**Target Completion:** v1.0.0

**Description:**
Allow users to create custom content extractors for specific sites or content types.

**Concept:**
```javascript
// plugins/hacker-news-extractor.js
export default {
  name: 'hacker-news',
  matches: (url) => url.includes('news.ycombinator.com'),
  extract: async (html, url) => {
    // Custom extraction logic
    return {
      title: '...',
      content: '...',
      metadata: {}
    };
  }
};
```

---

### LT-2: Database Storage Option

**Priority:** 🔵 Roadmap
**Status:** ❌ Not Started
**Estimated Effort:** 2-3 weeks
**Target Completion:** v2.0.0

**Description:**
Option to store crawled content in SQLite database instead of files for easier querying and management.

**Benefits:**
- Full-text search
- Metadata queries
- Change tracking
- Easier content management

---

### LT-3: Web UI for Configuration

**Priority:** 🔵 Roadmap
**Status:** ❌ Not Started
**Estimated Effort:** 3-4 weeks
**Target Completion:** v2.0.0

**Description:**
Optional web interface for configuring crawls, monitoring progress, and browsing results.

---

### LT-4: Support for GitLab and Bitbucket

**Priority:** 🔵 Roadmap
**Status:** ❌ Not Started
**Estimated Effort:** 1 week
**Target Completion:** v1.5.0

**Description:**
Extend Git URL parsing to support GitLab and Bitbucket repositories in addition to GitHub.

---

### LT-5: Distributed Crawling Support

**Priority:** 🔵 Roadmap
**Status:** ❌ Not Started
**Estimated Effort:** 3-4 weeks
**Target Completion:** v3.0.0

**Description:**
Allow multiple Inform instances to coordinate and share crawling workload for very large sites.

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Complete pre-production review
2. ⏳ Create this action plan document
3. ⏳ Address HP-1: Add dependency installation docs
4. ⏳ Address HP-2: Resolve delay discrepancy
5. ⏳ Address HP-3: Add package.json metadata

### Short Term (Next 2 Weeks)
1. Address MP-4: Error aggregation
2. Address MP-1: robots.txt support
3. Address MP-2: Retry logic

### Medium Term (Next Month)
1. Set up Dependabot (LP-3)
2. Create CONTRIBUTING.md (LP-2)
3. Add integration tests (LP-4)

### Long Term (Next Quarter)
1. Performance benchmarks
2. Verbose/quiet modes
3. Code refactoring
4. Plan for v1.0.0 features

---

## Task Assignment Process

1. **Review**: Team reviews this action plan
2. **Prioritize**: Confirm priority levels
3. **Estimate**: Refine effort estimates
4. **Assign**: Assign tasks to team members
5. **Track**: Update status as work progresses
6. **Document**: Update CHANGELOG.md for each completed task

---

## Progress Tracking

To update task status, change the status field:
- ❌ Not Started
- 🟡 In Progress
- ✅ Completed
- 🚫 Blocked
- ⏸️ Paused

And update the checkboxes in acceptance criteria as items are completed.

---

## Notes

- This is a living document and should be updated as work progresses
- New issues may be added as they are discovered
- Priorities may be adjusted based on user feedback and business needs
- All completed tasks should be documented in CHANGELOG.md

---

**Last Updated:** 2025-11-19
**Next Review:** TBD (after completing high priority tasks)
