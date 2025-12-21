import { describe, it, expect, beforeEach } from "bun:test";

import { FeedCrawler, isFeedUrl } from "../src/FeedCrawler.js";
import {
  detectSourceKind,
  shouldUseFeedMode,
  isFeedSource
} from "../src/sources/index.js";

describe("FeedCrawler", () => {
  describe("isFeedUrl", () => {
    it("should detect YouTube URLs", () => {
      expect(isFeedUrl("https://www.youtube.com/@channel")).toBe(true);
      expect(isFeedUrl("https://www.youtube.com/channel/UCxxx")).toBe(true);
      expect(isFeedUrl("https://www.youtube.com/playlist?list=PLxxx")).toBe(true);
      expect(isFeedUrl("https://youtu.be/videoId")).toBe(true);
    });

    it("should detect Bluesky URLs", () => {
      expect(isFeedUrl("https://bsky.app/profile/user.bsky.social")).toBe(true);
      expect(isFeedUrl("user.bsky.social")).toBe(true);
    });

    it("should detect X/Twitter URLs", () => {
      expect(isFeedUrl("https://x.com/username")).toBe(true);
      expect(isFeedUrl("https://twitter.com/username")).toBe(true);
    });

    it("should detect RSS/Atom feeds", () => {
      expect(isFeedUrl("https://example.com/feed.xml")).toBe(true);
      expect(isFeedUrl("https://example.com/rss")).toBe(true);
      expect(isFeedUrl("https://example.com/atom")).toBe(true);
      expect(isFeedUrl("https://example.com/feed")).toBe(true);
    });

    it("should not detect regular web URLs as feeds", () => {
      expect(isFeedUrl("https://example.com")).toBe(false);
      expect(isFeedUrl("https://docs.example.com/getting-started")).toBe(false);
    });
  });

  describe("constructor", () => {
    it("should initialize with correct defaults", () => {
      const crawler = new FeedCrawler("https://example.com/feed.xml", {
        outputDir: "test-output"
      });

      expect(crawler.sourceUrl).toBe("https://example.com/feed.xml");
      expect(crawler.outputDir).toBe("test-output");
      expect(crawler.limit).toBe(50);
      expect(crawler.maxRetries).toBe(3);
      expect(crawler.logLevel).toBe("normal");
      expect(crawler.ignoreErrors).toBe(false);
      expect(crawler.ytLang).toBe("en");
      expect(crawler.ytIncludeTranscript).toBe(true);
      expect(crawler.failures.size).toBe(0);
      expect(crawler.successes.size).toBe(0);
    });

    it("should accept custom options", () => {
      const crawler = new FeedCrawler("https://www.youtube.com/@channel", {
        outputDir: "custom-output",
        limit: 20,
        maxRetries: 5,
        logLevel: "verbose",
        ignoreErrors: true,
        ytLang: "es",
        ytIncludeTranscript: false,
        xBearerToken: "test-token",
        xRssTemplate: "https://nitter.example.com/{user}/rss",
        bskyApiBase: "https://custom.bsky.api"
      });

      expect(crawler.outputDir).toBe("custom-output");
      expect(crawler.limit).toBe(20);
      expect(crawler.maxRetries).toBe(5);
      expect(crawler.logLevel).toBe("verbose");
      expect(crawler.ignoreErrors).toBe(true);
      expect(crawler.ytLang).toBe("es");
      expect(crawler.ytIncludeTranscript).toBe(false);
      expect(crawler.xBearerToken).toBe("test-token");
      expect(crawler.xRssTemplate).toBe("https://nitter.example.com/{user}/rss");
      expect(crawler.bskyApiBase).toBe("https://custom.bsky.api");
    });

    it("should detect source kind for YouTube", () => {
      const crawler = new FeedCrawler("https://www.youtube.com/@channel");
      expect(crawler.sourceKind).toBe("youtube");
    });

    it("should detect source kind for Bluesky", () => {
      const crawler = new FeedCrawler("https://bsky.app/profile/user.bsky.social");
      expect(crawler.sourceKind).toBe("bluesky");
    });

    it("should detect source kind for X", () => {
      const crawler = new FeedCrawler("https://x.com/username");
      expect(crawler.sourceKind).toBe("x");
    });

    it("should detect source kind for RSS", () => {
      const crawler = new FeedCrawler("https://example.com/feed.xml");
      expect(crawler.sourceKind).toBe("rss");
    });
  });

  describe("getSourceName", () => {
    it("should return human-readable names", () => {
      expect(new FeedCrawler("https://www.youtube.com/@channel").getSourceName()).toBe("YouTube");
      expect(new FeedCrawler("https://bsky.app/profile/test").getSourceName()).toBe("Bluesky");
      expect(new FeedCrawler("https://x.com/test").getSourceName()).toBe("X (Twitter)");
      expect(new FeedCrawler("https://example.com/feed.xml").getSourceName()).toBe("RSS/Atom Feed");
    });
  });
});

describe("Source Detection", () => {
  describe("detectSourceKind", () => {
    it("should detect YouTube URLs", () => {
      expect(detectSourceKind("https://www.youtube.com/@channel")).toBe("youtube");
      expect(detectSourceKind("https://www.youtube.com/channel/UCxxx")).toBe("youtube");
      expect(detectSourceKind("https://www.youtube.com/playlist?list=PLxxx")).toBe("youtube");
      expect(detectSourceKind("https://youtu.be/videoId")).toBe("youtube");
    });

    it("should detect Bluesky URLs and handles", () => {
      expect(detectSourceKind("https://bsky.app/profile/user.bsky.social")).toBe("bluesky");
      expect(detectSourceKind("user.bsky.social")).toBe("bluesky");
    });

    it("should detect X URLs and handles", () => {
      expect(detectSourceKind("https://x.com/username")).toBe("x");
      expect(detectSourceKind("https://twitter.com/username")).toBe("x");
      expect(detectSourceKind("@username")).toBe("x");
    });

    it("should detect RSS/Atom feeds by URL pattern", () => {
      expect(detectSourceKind("https://example.com/feed.xml")).toBe("rss");
      expect(detectSourceKind("https://example.com/rss")).toBe("rss");
      expect(detectSourceKind("https://example.com/feed")).toBe("rss");
      expect(detectSourceKind("https://example.com/atom.xml")).toBe("rss");
    });

    it("should return null for unknown URLs", () => {
      expect(detectSourceKind("https://example.com")).toBe(null);
      expect(detectSourceKind("https://docs.example.com/api")).toBe(null);
    });
  });

  describe("shouldUseFeedMode", () => {
    it("should return true for feed sources", () => {
      expect(shouldUseFeedMode("https://www.youtube.com/@channel")).toBe(true);
      expect(shouldUseFeedMode("https://bsky.app/profile/test")).toBe(true);
      expect(shouldUseFeedMode("https://x.com/test")).toBe(true);
      expect(shouldUseFeedMode("https://example.com/feed.xml")).toBe(true);
    });

    it("should return true for URL patterns even without explicit detection", () => {
      expect(shouldUseFeedMode("https://blog.example.com/rss")).toBe(true);
      expect(shouldUseFeedMode("https://news.example.com/feed")).toBe(true);
    });

    it("should return false for regular web URLs", () => {
      expect(shouldUseFeedMode("https://example.com")).toBe(false);
      expect(shouldUseFeedMode("https://docs.example.com/getting-started")).toBe(false);
    });
  });

  describe("isFeedSource", () => {
    it("should return true for detectable feed sources", () => {
      expect(isFeedSource("https://www.youtube.com/@channel")).toBe(true);
      expect(isFeedSource("https://bsky.app/profile/test")).toBe(true);
      expect(isFeedSource("user.bsky.social")).toBe(true);
      expect(isFeedSource("@username")).toBe(true);
    });

    it("should return false for non-feed sources", () => {
      expect(isFeedSource("https://example.com")).toBe(false);
    });
  });
});
