import { describe, it, expect } from "bun:test";

import {
  sha1,
  slugify,
  toIsoDate,
  first,
  sanitizeFilename,
  mdEscape,
  stripHtml,
  normalizeUrl
} from "../src/sources/util.js";

describe("Sources Utilities", () => {
  describe("sha1", () => {
    it("should generate consistent hashes", () => {
      const hash1 = sha1("test");
      const hash2 = sha1("test");
      expect(hash1).toBe(hash2);
    });

    it("should generate different hashes for different inputs", () => {
      const hash1 = sha1("test1");
      const hash2 = sha1("test2");
      expect(hash1).not.toBe(hash2);
    });

    it("should return hex string", () => {
      const hash = sha1("test");
      expect(hash).toMatch(/^[a-f0-9]{40}$/);
    });
  });

  describe("slugify", () => {
    it("should convert to lowercase", () => {
      expect(slugify("Hello World")).toBe("hello-world");
    });

    it("should replace spaces and special chars with hyphens", () => {
      expect(slugify("Hello, World!")).toBe("hello-world");
    });

    it("should remove quotes", () => {
      expect(slugify("It's a 'test'")).toBe("its-a-test");
    });

    it("should collapse multiple hyphens", () => {
      expect(slugify("hello---world")).toBe("hello-world");
    });

    it("should remove leading and trailing hyphens", () => {
      expect(slugify("-hello-")).toBe("hello");
    });

    it("should truncate to 120 characters", () => {
      const longString = "a".repeat(200);
      expect(slugify(longString).length).toBe(120);
    });

    it("should return 'item' for empty string", () => {
      expect(slugify("")).toBe("item");
    });
  });

  describe("toIsoDate", () => {
    it("should convert valid date strings", () => {
      const result = toIsoDate("2024-01-15T12:00:00Z");
      expect(result).toBe("2024-01-15T12:00:00.000Z");
    });

    it("should handle various date formats", () => {
      expect(toIsoDate("Mon, 15 Jan 2024 12:00:00 GMT")).toMatch(/2024-01-15/);
      expect(toIsoDate("2024-01-15")).toMatch(/2024-01-15/);
    });

    it("should return undefined for invalid dates", () => {
      expect(toIsoDate("not a date")).toBe(undefined);
    });

    it("should return undefined for empty/undefined input", () => {
      expect(toIsoDate("")).toBe(undefined);
      expect(toIsoDate(undefined)).toBe(undefined);
    });
  });

  describe("first", () => {
    it("should return first non-empty value", () => {
      expect(first(undefined, "", "hello", "world")).toBe("hello");
    });

    it("should trim values", () => {
      expect(first("  hello  ", "world")).toBe("hello");
    });

    it("should return undefined if all empty", () => {
      expect(first(undefined, "", "  ")).toBe(undefined);
    });
  });

  describe("sanitizeFilename", () => {
    it("should remove invalid characters", () => {
      expect(sanitizeFilename('file<>:"/\\|?*name')).toBe("file_________name");
    });

    it("should truncate long filenames", () => {
      const longName = "a".repeat(200);
      expect(sanitizeFilename(longName).length).toBe(180);
    });
  });

  describe("mdEscape", () => {
    it("should escape markdown special characters", () => {
      expect(mdEscape("*bold* and _italic_")).toBe("\\*bold\\* and \\_italic\\_");
    });

    it("should escape code backticks", () => {
      expect(mdEscape("`code`")).toBe("\\`code\\`");
    });

    it("should escape links", () => {
      expect(mdEscape("[text](url)")).toBe("\\[text\\]\\(url\\)");
    });
  });

  describe("stripHtml", () => {
    it("should remove HTML tags", () => {
      expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
    });

    it("should decode HTML entities", () => {
      expect(stripHtml("&amp; &lt; &gt;")).toBe("& < >");
    });

    it("should remove script and style tags", () => {
      expect(stripHtml("<script>alert('hi')</script>content")).toBe("content");
      expect(stripHtml("<style>.class{}</style>content")).toBe("content");
    });

    it("should handle CDATA sections", () => {
      expect(stripHtml("<![CDATA[Hello World]]>")).toBe("Hello World");
    });

    it("should normalize whitespace", () => {
      expect(stripHtml("<p>Hello</p>  <p>World</p>")).toBe("Hello World");
    });
  });

  describe("normalizeUrl", () => {
    it("should add https:// if missing", () => {
      expect(normalizeUrl("example.com")).toBe("https://example.com");
    });

    it("should preserve existing protocol", () => {
      expect(normalizeUrl("https://example.com")).toBe("https://example.com");
      expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    });
  });
});
