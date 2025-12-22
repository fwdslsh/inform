import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { writeFile, unlink, mkdir, rmdir } from "node:fs/promises";
import { join } from "node:path";

import {
  DEFAULTS,
  loadConfig,
  mergeOptions,
  extractCliOverrides,
  resolveEnvVars
} from "../src/config.js";

describe("Config Module", () => {
  describe("DEFAULTS", () => {
    it("should have expected default values", () => {
      expect(DEFAULTS.outputDir).toBe("crawled-pages");
      expect(DEFAULTS.maxRetries).toBe(3);
      expect(DEFAULTS.logLevel).toBe("normal");
      expect(DEFAULTS.ignoreErrors).toBe(false);
      expect(DEFAULTS.limit).toBe(100);
      expect(DEFAULTS.delay).toBe(2000);
      expect(DEFAULTS.concurrency).toBe(3);
      expect(DEFAULTS.maxQueueSize).toBe(10000);
      expect(DEFAULTS.ytLang).toBe("en");
      expect(DEFAULTS.ytIncludeTranscript).toBe(true);
    });
  });

  describe("mergeOptions", () => {
    it("should merge options with correct precedence", () => {
      const result = mergeOptions({
        defaults: { outputDir: "default", limit: 10 },
        globals: { limit: 20 },
        target: { limit: 30 },
        cli: { limit: 40 }
      });

      expect(result.outputDir).toBe("default");
      expect(result.limit).toBe(40);
    });

    it("should not override with undefined values", () => {
      const result = mergeOptions({
        defaults: { outputDir: "default", limit: 10 },
        globals: { outputDir: undefined },
        cli: { limit: undefined }
      });

      expect(result.outputDir).toBe("default");
      expect(result.limit).toBe(10);
    });

    it("should handle missing layers gracefully", () => {
      const result = mergeOptions({
        defaults: { outputDir: "default" }
      });

      expect(result.outputDir).toBe("default");
    });

    it("should merge arrays from config but replace from CLI", () => {
      const result = mergeOptions({
        defaults: { include: ["*.md"] },
        globals: { include: ["*.html"] },
        target: { include: ["*.txt"] },
        cli: { include: ["*.json"] }
      });

      // CLI replaces entirely
      expect(result.include).toEqual(["*.json"]);
    });

    it("should merge arrays between config layers", () => {
      const result = mergeOptions({
        defaults: { include: ["*.md"] },
        globals: { include: ["*.html"] }
      });

      // Config layers are merged (deduplicated)
      expect(result.include).toContain("*.md");
      expect(result.include).toContain("*.html");
    });
  });

  describe("extractCliOverrides", () => {
    it("should extract only provided CLI options", () => {
      const argv = ["url", "--output-dir", "custom", "--verbose"];
      const parsed = {
        url: "url",
        outputDir: "custom",
        logLevel: "verbose",
        limit: 50 // Default, not in argv
      };

      const overrides = extractCliOverrides(argv, parsed);

      expect(overrides.outputDir).toBe("custom");
      expect(overrides.logLevel).toBe("verbose");
      expect(overrides.limit).toBeUndefined();
    });

    it("should handle flag=value format", () => {
      const argv = ["--output-dir=custom"];
      const parsed = { outputDir: "custom" };

      const overrides = extractCliOverrides(argv, parsed);

      expect(overrides.outputDir).toBe("custom");
    });

    it("should return empty object when no flags provided", () => {
      const argv = ["https://example.com"];
      const parsed = { url: "https://example.com", limit: 50 };

      const overrides = extractCliOverrides(argv, parsed);

      expect(Object.keys(overrides).length).toBe(0);
    });
  });

  describe("resolveEnvVars", () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore original environment
      process.env = { ...originalEnv };
    });

    it("should resolve X_BEARER_TOKEN from environment", () => {
      process.env.X_BEARER_TOKEN = "test-token";

      const options = {};
      const result = resolveEnvVars(options);

      expect(result.xBearerToken).toBe("test-token");
    });

    it("should not override explicitly set values", () => {
      process.env.X_BEARER_TOKEN = "env-token";

      const options = { xBearerToken: "explicit-token" };
      const result = resolveEnvVars(options);

      expect(result.xBearerToken).toBe("explicit-token");
    });

    it("should resolve X_RSS_TEMPLATE from environment", () => {
      process.env.X_RSS_TEMPLATE = "https://nitter.example.com/{user}/rss";

      const options = {};
      const result = resolveEnvVars(options);

      expect(result.xRssTemplate).toBe("https://nitter.example.com/{user}/rss");
    });

    it("should resolve BSKY_API_BASE from environment", () => {
      process.env.BSKY_API_BASE = "https://custom.bsky.api";

      const options = {};
      const result = resolveEnvVars(options);

      expect(result.bskyApiBase).toBe("https://custom.bsky.api");
    });
  });

  describe("loadConfig", () => {
    const testDir = join(process.cwd(), ".test-config");
    const configPath = join(testDir, "inform.yaml");

    beforeEach(async () => {
      await mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      try {
        await unlink(configPath);
        await rmdir(testDir);
      } catch {
        // Ignore cleanup errors
      }
    });

    it("should return null when no config path provided", async () => {
      const result = await loadConfig(undefined);
      expect(result).toBeNull();
    });

    it("should throw when config file not found", async () => {
      await expect(loadConfig("/nonexistent/path.yaml")).rejects.toThrow(
        "Config file not found"
      );
    });

    it("should parse simple YAML config", async () => {
      const yaml = `
globals:
  outputDir: ./output
  limit: 100
`;
      await writeFile(configPath, yaml);

      const result = await loadConfig(configPath);

      expect(result).not.toBeNull();
      expect(result.globals.outputDir).toBe("./output");
      expect(result.globals.limit).toBe(100);
    });

    it("should parse config with targets", async () => {
      const yaml = `
globals:
  outputDir: ./output

targets:
  - url: https://example.com/feed.xml
    limit: 20
  - url: https://github.com/owner/repo
    include:
      - "*.md"
`;
      await writeFile(configPath, yaml);

      const result = await loadConfig(configPath);

      expect(result.targets).toHaveLength(2);
      expect(result.targets[0].url).toBe("https://example.com/feed.xml");
      expect(result.targets[0].limit).toBe(20);
      expect(result.targets[1].include).toContain("*.md");
    });

    it("should normalize string arrays in globals", async () => {
      const yaml = `
globals:
  include: "*.md"
`;
      await writeFile(configPath, yaml);

      const result = await loadConfig(configPath);

      expect(Array.isArray(result.globals.include)).toBe(true);
      expect(result.globals.include).toContain("*.md");
    });
  });
});
