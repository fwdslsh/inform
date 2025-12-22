import { describe, it, expect } from "bun:test";

import {
  renderItemToMarkdown,
  renderItemsToDigest
} from "../src/sources/render.js";

describe("Markdown Rendering", () => {
  describe("renderItemToMarkdown", () => {
    it("should render a basic item", () => {
      const item = {
        kind: "rss",
        id: "test-id",
        url: "https://example.com/post",
        title: "Test Post",
        publishedAt: "2024-01-15T12:00:00.000Z",
        author: "Test Author",
        contentText: "This is the content.",
        tags: ["test", "example"]
      };

      const md = renderItemToMarkdown(item);

      expect(md).toContain("# Test Post");
      expect(md).toContain("**Source**: RSS/Atom Feed");
      expect(md).toContain("**Author**: Test Author");
      expect(md).toContain("**Published**:");
      expect(md).toContain("**URL**: <https://example.com/post>");
      expect(md).toContain("**Tags**: test, example");
      expect(md).toContain("This is the content.");
    });

    it("should handle missing optional fields", () => {
      const item = {
        kind: "youtube",
        id: "test-id",
        url: "https://youtube.com/watch?v=xxx",
        title: "Video Title"
      };

      const md = renderItemToMarkdown(item);

      expect(md).toContain("# Video Title");
      expect(md).toContain("**Source**: YouTube");
      expect(md).not.toContain("**Author**:");
      expect(md).not.toContain("**Published**:");
      expect(md).toContain("_No content extracted._");
    });

    it("should render HTML content in code block when no text available", () => {
      const item = {
        kind: "rss",
        id: "test-id",
        url: "https://example.com/post",
        title: "HTML Post",
        contentHtml: "<p>Hello World</p>"
      };

      const md = renderItemToMarkdown(item);

      expect(md).toContain("```html");
      expect(md).toContain("<p>Hello World</p>");
      expect(md).toContain("```");
    });

    it("should format different source kinds correctly", () => {
      const kinds = [
        { kind: "rss", expected: "RSS/Atom Feed" },
        { kind: "youtube", expected: "YouTube" },
        { kind: "bluesky", expected: "Bluesky" },
        { kind: "x", expected: "X (Twitter)" }
      ];

      for (const { kind, expected } of kinds) {
        const item = {
          kind,
          id: "test",
          url: "https://example.com",
          title: "Test"
        };
        const md = renderItemToMarkdown(item);
        expect(md).toContain(`**Source**: ${expected}`);
      }
    });
  });

  describe("renderItemsToDigest", () => {
    it("should render multiple items into a digest", () => {
      const items = [
        {
          kind: "rss",
          id: "1",
          url: "https://example.com/1",
          title: "First Post",
          contentText: "First content"
        },
        {
          kind: "rss",
          id: "2",
          url: "https://example.com/2",
          title: "Second Post",
          contentText: "Second content"
        }
      ];

      const digest = renderItemsToDigest(items, {
        title: "My Digest",
        description: "A collection of posts"
      });

      expect(digest).toContain("# My Digest");
      expect(digest).toContain("A collection of posts");
      expect(digest).toContain("_Items: 2_");
      expect(digest).toContain("## Contents");
      expect(digest).toContain("[First Post]");
      expect(digest).toContain("[Second Post]");
      expect(digest).toContain("## 1. First Post");
      expect(digest).toContain("## 2. Second Post");
      expect(digest).toContain("First content");
      expect(digest).toContain("Second content");
    });

    it("should use default title when not provided", () => {
      const items = [{
        kind: "rss",
        id: "1",
        url: "https://example.com",
        title: "Test"
      }];

      const digest = renderItemsToDigest(items);

      expect(digest).toContain("# Feed Digest");
    });
  });
});
