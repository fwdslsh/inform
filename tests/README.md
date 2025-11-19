# Testing Guide for Inform

This guide documents testing best practices, common pitfalls, and lessons learned from real incidents.

## Table of Contents

- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Critical Testing Rules](#critical-testing-rules)
- [Common Pitfalls](#common-pitfalls)
- [Incident Reports](#incident-reports)

---

## Running Tests

### All Tests
```bash
bun test
```

### Specific Test Suite
```bash
bun test tests/web-crawler.test.js
bun test tests/integration/
```

### Watch Mode
```bash
bun test --watch
```

### Current Test Coverage
- **Unit Tests**: 52 tests across 5 files
  - `tests/cli.test.js` - CLI and WebCrawler initialization
  - `tests/file-filter.test.js` - File filtering patterns
  - `tests/git-crawler.test.js` - GitHub repository crawling
  - `tests/git-url-parser.test.js` - Git URL parsing
  - `tests/web-crawler.test.js` - Web crawling logic

- **Integration Tests**: 11 tests across 2 files
  - `tests/integration/web-crawler-integration.test.js` - End-to-end web crawling (7 tests)
  - `tests/integration/git-crawler-integration.test.js` - End-to-end Git crawling (4 tests)

**Total**: 63 tests with 191 assertions

---

## Test Structure

### Unit Tests
- Test individual functions and classes in isolation
- Use mocks for external dependencies (fetch, file system)
- Fast execution (< 200ms for entire suite)
- Located in `tests/*.test.js`

### Integration Tests
- Test complete workflows end-to-end
- Use real HTTP servers (local test server)
- Use real file system operations
- Located in `tests/integration/*.test.js`
- Longer execution time acceptable (2-7 seconds per suite)

---

## Critical Testing Rules

### Rule #1: ALWAYS Clean Up Global Mocks

**❌ WRONG** - This will pollute all subsequent tests:
```javascript
beforeEach(() => {
  const mockFetch = mock(() => ({ ok: true }));
  global.fetch = mockFetch;  // ⚠️ Never restored!
});
```

**✅ CORRECT** - Save and restore:
```javascript
let originalFetch;

beforeEach(() => {
  originalFetch = global.fetch;  // Save original
  global.fetch = mockFetch;
});

afterEach(() => {
  global.fetch = originalFetch;  // Restore after test
});
```

**Why This Matters:**
- Bun's test runner may execute test files in any order
- Mocks can leak between test suites
- Incomplete mocks cause cryptic errors in unrelated tests
- Session crashes can occur from cascading failures

### Rule #2: Mock Objects Must Be Complete

When mocking Response objects, include ALL methods that might be called:

**❌ WRONG** - Incomplete mock:
```javascript
mockFetch = mock(() => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({})
  // ⚠️ Missing: .text(), .headers, .blob(), etc.
}));
```

**✅ CORRECT** - Complete mock:
```javascript
mockFetch = mock(() => ({
  ok: true,
  status: 200,
  headers: new Headers({
    'content-type': 'application/json'
  }),
  text: () => Promise.resolve('response body'),
  json: () => Promise.resolve({}),
  blob: () => Promise.resolve(new Blob()),
  arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
}));
```

### Rule #3: NEVER Call process.exit() in Library Code

**❌ WRONG** - Library code exits process:
```javascript
// In src/WebCrawler.js
displaySummary() {
  console.log('Crawl complete!');
  if (this.failures.size > 0) {
    process.exit(1);  // ⚠️ Kills test runner!
  }
}
```

**✅ CORRECT** - Return status, let caller handle exit:
```javascript
// In src/WebCrawler.js
displaySummary() {
  console.log('Crawl complete!');
  return this.failures.size > 0;  // Returns boolean
}

// In src/cli.js (CLI layer only)
const hasFailures = crawler.displaySummary();
if (hasFailures && !options.ignoreErrors) {
  process.exit(1);  // ✅ Only CLI exits
}
```

**Why This Matters:**
- Test runners need to complete all tests
- Libraries should be reusable in different contexts
- Proper separation of concerns

### Rule #4: Test Files Must Be Isolated

Each test file should:
- Not depend on execution order
- Clean up all resources (files, servers, timers)
- Work when run individually
- Work when run with all other tests

**Verification:**
```bash
# All tests should pass individually:
bun test tests/web-crawler.test.js  # ✅ Pass
bun test tests/git-crawler.test.js  # ✅ Pass

# AND when run together:
bun test  # ✅ Pass
```

---

## Common Pitfalls

### 1. Global State Pollution

**Problem**: Modifying global objects without restoration

**Examples:**
- `global.fetch = mockFetch`
- `process.env.GITHUB_TOKEN = 'fake-token'`
- `console.log = jest.fn()`

**Solution**: Always save and restore in afterEach/afterAll

### 2. Async Cleanup Not Awaited

**❌ WRONG:**
```javascript
afterEach(() => {
  server.stop();  // ⚠️ Not awaited!
});
```

**✅ CORRECT:**
```javascript
afterEach(async () => {
  await server.stop();  // ✅ Properly awaited
});
```

### 3. Shared Test Resources

**Problem**: Multiple tests modifying the same directory/state

**Solution**: Use unique output directories per test:
```javascript
const testOutputDir = `test-output-${Date.now()}`;
```

Or clean up after each test:
```javascript
afterEach(async () => {
  if (existsSync(testOutputDir)) {
    await rm(testOutputDir, { recursive: true, force: true });
  }
});
```

### 4. Incomplete Error Handling

Tests should handle errors from async operations:

**❌ WRONG:**
```javascript
it('should fetch data', async () => {
  const data = await fetchData();  // ⚠️ Unhandled rejection if fails
  expect(data).toBeDefined();
});
```

**✅ CORRECT:**
```javascript
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
}, 10000);  // ✅ Explicit timeout
```

---

## Incident Reports

### Incident #1: Global Fetch Mock Pollution (2025-11-19)

**Severity**: CRITICAL - Caused session crashes and all tests to fail

**Symptoms:**
- Tests passed individually but failed when run together
- Cryptic errors: `response.text is not a function`
- Error: `undefined is not an object (evaluating 'response.headers.get')`
- GitHub Actions failing with same errors
- Development sessions crashing when running `bun test`

**Root Cause:**
`tests/git-crawler.test.js` was mocking `global.fetch` in `beforeEach()` but never restoring it in `afterEach()`. The mock returned an incomplete Response object:

```javascript
// The broken mock
mockFetch = mock(() => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve([...])
  // ⚠️ Missing: .text(), .headers, .blob(), etc.
}));
global.fetch = mockFetch;  // ⚠️ Never restored!
```

**Impact Flow:**
1. Unit tests run → `git-crawler.test.js` mocks `global.fetch`
2. Mock lacks `.text()` and `.headers` methods
3. Integration tests run → use polluted mock instead of real fetch
4. `RobotsParser` tries `response.text()` → Crashes with "not a function"
5. `WebCrawler` tries `response.headers.get()` → Crashes with "undefined"
6. All 11 integration tests fail → Session crashes

**Fix Applied:**
- Added `afterEach()` hook to restore original fetch
- Saved `originalFetch` before mocking in `beforeEach()`
- Restored `global.fetch = originalFetch` after each test

**Commit:** `8e143ec - Fix test failures caused by global fetch mock pollution`

**Files Changed:**
- `tests/git-crawler.test.js` - Added cleanup hooks
- `tests/cli.test.js` - Fixed URL normalization test expectation

**Lessons Learned:**
1. **ALWAYS restore global mocks** - No exceptions
2. **Mock objects must be complete** - Include all methods that might be called
3. **Test in CI** - Catches issues that don't appear locally
4. **Test all tests together** - Not just individual suites
5. **Document incidents** - Prevent future occurrences

**Prevention:**
- Added this testing guide
- Code review checklist updated
- CI runs all tests together (already in place)

---

### Incident #2: process.exit() in Library Code (2025-11-19)

**Severity**: CRITICAL - Killed test runner mid-execution

**Symptoms:**
- Running tests caused session to crash
- Test runner terminated abruptly
- No error messages, just sudden exit

**Root Cause:**
`src/WebCrawler.js` and `src/GitCrawler.js` were calling `process.exit(1)` directly in the `displaySummary()` method when failures occurred. This killed the entire test runner process.

**Fix Applied:**
- Removed all `process.exit()` calls from library code
- Changed `displaySummary()` to return boolean (true if failures)
- Moved exit logic to CLI layer (`src/cli.js`)

**Commit:** `e6a66e1 - Fix critical bug: Remove process.exit() from library code`

**Architectural Principle:**
- **Libraries**: Return status, don't control process lifecycle
- **CLI Layer**: Handle process exit codes based on library results
- **Tests**: Can now safely test error conditions without crashes

---

## Writing New Tests

### Checklist for New Test Files

- [ ] Import cleanup hooks: `beforeEach`, `afterEach`, `afterAll`
- [ ] Save and restore any global mocks
- [ ] Use unique output directories or clean up after tests
- [ ] Await all async operations in cleanup hooks
- [ ] Test file works individually: `bun test path/to/file.test.js`
- [ ] Test file works with full suite: `bun test`
- [ ] No `process.exit()` calls in library code being tested
- [ ] Mocked objects include all methods that might be called

### Template for Tests with Global Mocks

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('MyFeature', () => {
  let originalFetch;
  let originalEnv;

  beforeEach(() => {
    // Save originals
    originalFetch = global.fetch;
    originalEnv = { ...process.env };

    // Apply mocks
    global.fetch = mockFetch;
    process.env.TEST_VAR = 'test-value';
  });

  afterEach(() => {
    // Restore originals
    global.fetch = originalFetch;
    process.env = originalEnv;
  });

  it('should do something', () => {
    // Test code here
  });
});
```

---

## Best Practices

### 1. Use Descriptive Test Names
```javascript
// ❌ Bad
it('works', () => { ... });

// ✅ Good
it('should crawl multiple pages and save them as markdown', () => { ... });
```

### 2. Test One Thing Per Test
```javascript
// ❌ Bad - Testing multiple concerns
it('should initialize and crawl and save', () => {
  const crawler = new WebCrawler(url);
  expect(crawler).toBeDefined();
  await crawler.crawl();
  expect(crawler.successes.size).toBeGreaterThan(0);
  const files = await readdir('output');
  expect(files.length).toBeGreaterThan(0);
});

// ✅ Good - Separate tests
it('should initialize with correct defaults', () => { ... });
it('should crawl multiple pages', () => { ... });
it('should save files to output directory', () => { ... });
```

### 3. Use Test Timeouts for Async Operations
```javascript
// For tests that may take longer (network, file I/O)
it('should download files from GitHub', async () => {
  // Test code
}, 30000);  // 30 second timeout
```

### 4. Prefer Integration Tests for Critical Paths
- Happy path: User provides URL → pages crawled → files saved
- Error handling: Invalid URL → appropriate error message
- Edge cases: Empty site, redirect loops, rate limits

### 5. Keep Unit Tests Fast
- Mock external dependencies (fetch, file system)
- Target < 200ms for entire unit test suite
- Run unit tests in watch mode during development

---

## Debugging Test Failures

### Tests Pass Individually But Fail Together

**Likely Cause**: Test pollution (global state not cleaned up)

**Investigation Steps:**
1. Check for global mocks: `grep -r "global\." tests/`
2. Verify cleanup hooks: `grep -r "afterEach\|afterAll" tests/`
3. Run tests in different orders to isolate the polluting test
4. Look for environment variable modifications
5. Check for shared file system state

### Tests Fail Only in CI

**Likely Causes:**
- Timing issues (CI slower than local)
- Missing dependencies
- Environment differences

**Investigation Steps:**
1. Check test timeouts
2. Verify all dependencies in package.json
3. Check for hardcoded paths or assumptions
4. Review CI logs for error messages

### Session Crashes During Tests

**Likely Causes:**
- `process.exit()` being called in library code
- Unhandled promise rejections
- Infinite loops
- Memory exhaustion

**Investigation Steps:**
1. Search for `process.exit`: `grep -r "process\.exit" src/`
2. Run tests with timeout: `timeout 60 bun test`
3. Check memory usage during test run
4. Add try-catch blocks to isolate crashes

---

## Continuous Integration

Our CI runs all tests on every push:
- Unit tests must pass
- Integration tests must pass
- All tests run together (not just individually)
- Timeout: 10 minutes for full suite

If tests pass locally but fail in CI:
1. Run full test suite locally: `bun test`
2. Check for timing dependencies
3. Review CI logs for specific errors
4. Test on similar environment (Docker)

---

## Contact & Support

If you encounter test failures or have questions:
1. Check this guide first
2. Review incident reports for similar issues
3. Run tests individually to isolate the problem
4. Check for global state pollution
5. Open an issue with full error output and steps to reproduce

---

**Last Updated**: 2025-11-19
**Document Version**: 1.0
