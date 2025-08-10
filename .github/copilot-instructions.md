# Inform Web Crawler

**ALWAYS FOLLOW THESE INSTRUCTIONS COMPLETELY AND PRECISELY. Do not deviate from these commands unless the information here is incomplete or found to be in error. Only fallback to additional search and context gathering if the specific instructions fail or provide unexpected results.**

Inform is a high-performance command-line web crawler powered by Bun that downloads web pages and converts them to clean Markdown format. It's optimized for crawling documentation sites and preserving folder structure.

## Working Effectively

### Bootstrap and Setup (Required for all development)
- Install Bun runtime (required dependency):
  ```bash
  curl -fsSL https://bun.sh/install | bash
  source ~/.bashrc
  bun --version  # Should be >=1.0.0
  ```
- Install project dependencies:
  ```bash
  bun install  # Takes ~0.1 seconds (fresh) or ~0.01 seconds (cached). Set timeout to 30+ seconds.
  ```

### Development Commands
- Run tests:
  ```bash
  bun test  # Takes ~0.5 seconds. Set timeout to 30+ seconds.
  ```
- Run CLI directly:
  ```bash
  bun src/cli.js --help
  bun src/cli.js <url> --max-pages 5 --delay 200 --output-dir /tmp/test-output
  ```
- Build binary executable:
  ```bash
  bun build src/cli.js --compile --outfile inform-custom  # Takes ~0.2 seconds. Set timeout to 60+ seconds.
  ```
- Start development mode:
  ```bash
  bun --watch src/cli.js  # For file watching during development
  ```

## Validation Requirements

### Always Test After Changes
- **CRITICAL**: Always run the complete test suite before committing:
  ```bash
  bun test  # All 8 tests must pass
  ```
- **Manual Validation**: Test actual crawling functionality by setting up a local test server:
  ```bash
  # Create test HTML file
  echo '<!DOCTYPE html><html><head><title>Test</title></head><body><main><h1>Test Content</h1><p>Test paragraph</p><pre><code class="language-js">console.log("test");</code></pre></main></body></html>' > /tmp/test.html
  
  # Start local server (run in background)
  cd /tmp && python3 -m http.server 8000 &
  
  # Test the crawler
  bun src/cli.js http://localhost:8000/test.html --max-pages 1 --output-dir /tmp/test-crawl --delay 200
  
  # Verify output
  cat /tmp/test-crawl/test.html.md  # Should contain clean Markdown with code blocks
  
  # Stop server
  kill %1
  ```

### Required Validation Scenarios
- **Basic CLI**: Always test `bun src/cli.js --help` and `bun src/cli.js --version`
- **Binary Build**: Always test `bun build src/cli.js --compile --outfile /tmp/test-binary && /tmp/test-binary --version`
- **Core Functionality**: Use the local server test above to validate HTML-to-Markdown conversion works correctly
- **Watch Mode**: Test development mode with `bun --watch src/cli.js --help` (should work without errors)
- **Complete Validation**: Run this command chain to verify everything works:
  ```bash
  bun test && bun src/cli.js --version && bun build src/cli.js --compile --outfile /tmp/test-binary && /tmp/test-binary --version
  ```

## Build and Test Information

### Timing Expectations
- **Dependency install**: ~0.1 seconds (fresh) - NEVER CANCEL before 30 seconds
- **Test execution**: ~0.5 seconds - NEVER CANCEL before 30 seconds  
- **Binary compilation**: ~0.2 seconds - NEVER CANCEL before 60 seconds
- **Individual page crawl**: <1 second per page

### CI/CD Pipeline (.github/workflows/)
- **test-and-deploy.yml**: Runs `bun install` and `bun test` on every PR/push to main
- **release.yml**: Builds cross-platform binaries using `bun build --compile` for releases
- All CI steps must pass before merging

## Key Project Structure

### Source Code
```
src/
├── cli.js          # Main CLI entry point with argument parsing
└── WebCrawler.js   # Core crawler class with content extraction logic
```

### Tests
```
tests/
└── cli.test.js     # Unit tests using Bun's built-in test runner (8 tests)
```

### Documentation
```
docs/
├── installation.md # Installation instructions for end users
└── inform-64.png  # Logo asset
```

### Key Configuration Files
- `package.json` - NPM package config, dependencies (jsdom, turndown), Bun peer dependency
- `bun.lock` - Bun lockfile for dependency management
- `.gitignore` - Excludes node_modules, .giv/cache, .giv/tmp
- `LICENSE` - Creative Commons Attribution 4.0 license

## Common Development Tasks

### Making Code Changes
- Always run tests first to establish baseline: `bun test`
- Make minimal changes to `src/WebCrawler.js` or `src/cli.js`
- Run tests after each change: `bun test`
- Test CLI functionality manually with the validation scenario above
- No linting is configured - follow existing code style

### Adding Features
- Update `src/WebCrawler.js` for core functionality changes
- Update `src/cli.js` for new command-line options
- Add tests to `tests/cli.test.js` following existing patterns
- Update help text in `cli.js` if adding new options

### Debugging Issues
- Use `bun --watch src/cli.js` for development mode
- Check network connectivity if crawling fails
- Verify Bun installation with `bun --version` (must be >=1.0.0)
- Test with local files first using the validation scenario

## Dependencies and Requirements

### Runtime Requirements
- **Bun v1.0.0+** (critical dependency - the entire project is Bun-specific)
- Internet access for crawling external websites
- File system write access for output directory

### Core Dependencies (installed via `bun install`)
- `jsdom@^24.0.0` - HTML parsing and DOM manipulation
- `turndown@^7.1.2` - HTML to Markdown conversion

### Development Notes
- No build step required for development - Bun runs TypeScript/JavaScript directly
- No linting configured (eslint, prettier, etc.)
- No bundling required except for binary compilation
- Uses Bun's built-in test runner (not Jest, Mocha, etc.)

## Troubleshooting

### Common Issues
- **"bun: command not found"**: Install Bun and run `source ~/.bashrc`
- **Network errors during crawling**: Test with local server using validation scenario
- **Binary execution fails**: Ensure platform compatibility (Linux/macOS/Windows)
- **Tests fail**: Check Bun version and dependency installation

### Performance Notes
- Crawler uses concurrent requests (default: 3 concurrent)
- Rate limiting with configurable delays (default: 300ms)
- Optimized for documentation sites with proper folder structure preservation
- Memory efficient - processes one page at a time

## Important Limitations
- **Network Access**: External URL crawling may be restricted in some environments
- **Bun Dependency**: Cannot run with Node.js - strictly requires Bun runtime
- **Domain Restriction**: Only crawls within the same domain as the base URL
- **No Authentication**: Does not support login-protected content