import { describe, it, expect, beforeEach, vi } from "bun:test";

import { WebCrawler } from "../src/WebCrawler.js";

describe("WebCrawler", () => {
  let crawler;
  const baseUrl = "https://example.com";

  beforeEach(() => {
    crawler = new WebCrawler(baseUrl, {
      maxPages: 5,
      delay: 0,
      outputDir: "test-output",
      concurrency: 1,
    });
  });

  it("should initialize with correct defaults", () => {
    expect(crawler.baseUrl.href).toBe(baseUrl + "/");
    expect(crawler.maxPages).toBe(5);
    expect(crawler.delay).toBe(1000); // Default is now 1000ms (was 300ms)
    expect(crawler.outputDir).toBe("test-output");
    expect(crawler.concurrency).toBe(1);
    expect(crawler.visited.size).toBe(0);
    // URL constructor normalizes "https://example.com" to "https://example.com/" (with trailing slash)
    expect(crawler.toVisit.has(baseUrl + "/")).toBe(true);
  });

  it("should skip non-HTML file extensions", () => {
    expect(crawler.shouldSkipFile("/foo.pdf")).toBe(true);
    expect(crawler.shouldSkipFile("/bar.jpg")).toBe(true);
    expect(crawler.shouldSkipFile("/baz.js")).toBe(true);
    expect(crawler.shouldSkipFile("/index.html")).toBe(false);
    expect(crawler.shouldSkipFile("/docs/")).toBe(false);
  });

  it("should generate correct filepaths", () => {
    expect(
      normalizePath(crawler.generateFilepath("https://example.com/"))
    ).toBe("index.md");
    expect(
      normalizePath(crawler.generateFilepath("https://example.com/docs/api"))
    ).toBe("docs/api.md");
    expect(
      normalizePath(crawler.generateFilepath("https://example.com/foo?bar=baz"))
    ).toMatch(/foo_bar_baz\.md$/);
  });

  it("should clean up markdown", () => {
    const dirty =
      "[link]()\n\n\n\n# Title\n\n\n```js\nconsole.log(1);\n```\n\n";
    const cleaned = crawler.cleanupMarkdown(dirty);
    expect(cleaned).not.toMatch(/\[\]\(/);
    expect(cleaned).toMatch(/# Title/);
    expect(cleaned).toMatch(/```js/);
  });

  it("should process found links correctly", () => {
    // Mock the toVisit set to capture found links
    const foundLinks = new Set();
    crawler.toVisit = {
      has: () => false,
      add: (url) => foundLinks.add(url)
    };
    crawler.visited = new Set();
    
    crawler.processFoundLink('/foo', baseUrl);
    crawler.processFoundLink('https://other.com/bar', baseUrl);
    
    expect(foundLinks.has('https://example.com/foo')).toBe(true);
    expect(foundLinks.has('https://other.com/bar')).toBe(false);
  });

  it("should extract content using HTMLRewriter", async () => {
    const html = '<body><main><div>main content</div></main></body>';
    const result = await crawler.extractContentWithHTMLRewriter(html, baseUrl);
    
    expect(result).toBeDefined();
    expect(result.html).toBeDefined();
    expect(result.links).toBeDefined();
  });

  const normalizePath = (path) => path.replace(/\\/g, "/");

  describe("Raw mode functionality", () => {
    let rawCrawler;

    beforeEach(() => {
      rawCrawler = new WebCrawler(baseUrl, {
        maxPages: 5,
        delay: 0,
        outputDir: "test-output",
        concurrency: 1,
        raw: true,
      });
    });

    it("should initialize with raw mode enabled", () => {
      expect(rawCrawler.raw).toBe(true);
    });

    it("should generate HTML filepaths in raw mode", () => {
      expect(
        normalizePath(rawCrawler.generateFilepath("https://example.com/"))
      ).toBe("index.html");
      expect(
        normalizePath(
          rawCrawler.generateFilepath("https://example.com/docs/api")
        )
      ).toBe("docs/api.html");
      expect(
        normalizePath(
          rawCrawler.generateFilepath("https://example.com/foo?bar=baz")
        )
      ).toMatch(/foo_bar_baz\.html$/);
    });

    it("should generate MD filepaths in markdown mode (default)", () => {
      const mdCrawler = new WebCrawler(baseUrl, {
        maxPages: 5,
        delay: 0,
        outputDir: "test-output",
        concurrency: 1,
        raw: false,
      });
      expect(
        normalizePath(mdCrawler.generateFilepath("https://example.com/"))
      ).toBe("index.md");
      expect(
        normalizePath(
          mdCrawler.generateFilepath("https://example.com/docs/api")
        )
      ).toBe("docs/api.md");
      expect(
        normalizePath(
          mdCrawler.generateFilepath("https://example.com/foo?bar=baz")
        )
      ).toMatch(/foo_bar_baz\.md$/);
    });
  });
});
