# Inform Web Crawler - Complete Application Specification

## Overview

Inform is a high-performance, command-line web crawler designed to download web pages and convert them into clean Markdown format. It is optimized for crawling documentation sites, preserving folder structure, and providing efficient, reliable extraction of readable content. Inform is intended for developers, technical writers, and teams needing to archive, migrate, or analyze documentation and web content.

## Target Users

- Developers and technical writers who need to archive or migrate documentation sites.
- Teams requiring clean Markdown output for static site generators or content analysis.
- Users who need a lightweight, efficient tool for web crawling without complex setup.

## Core Functionality

### Primary Purpose

Crawl web pages and convert them into Markdown files while preserving the folder structure of the source site.

### Key Features

- HTML to Markdown conversion with clean formatting.
- Folder structure preservation for organized output.
- Configurable rate limiting to avoid overloading servers.
- Domain-restricted crawling to ensure focused content extraction.
- Concurrent requests for efficient crawling.
- Graceful error handling for network issues and invalid URLs.
- Git repository file downloading and extraction.

### Additional Features

- CLI options for flexible configuration.
- Output files named after the source HTML files.
- Support for cross-platform binary builds.

## Command Line Interface

### Application Name

`inform`

### Main Commands

#### 1. `crawl` (Default Command)

Crawls web pages starting from the specified URL and converts them to Markdown.

**Syntax:**

```bash
inform <url> [options]
```

**Workflow:**

1. Validates the base URL.
2. Initiates crawling from the base URL.
3. Extracts main content, code blocks, and headings.
4. Converts HTML to Markdown.
5. Saves output files in the specified directory.
6. Reports crawl summary.

**Expected Output:**

- Markdown files in the output directory.
- Folder structure matching the source site.
- Success message with file count and crawl time.
- Exit code 0 on success, 1 on recoverable errors, 2 on fatal errors.

#### 2. `help`

Displays help information for the CLI.

**Syntax:**

```bash
inform --help
```

**Expected Output:**

- Usage instructions, available commands, and options.
- Exit code 0 after displaying help.

#### 3. `version`

Displays the current version of Inform.

**Syntax:**

```bash
inform --version
```

**Expected Output:**

- Version number in the format `inform v{version}`.
- Exit code 0 after displaying version.

### Command Line Options

#### Crawl Options

**`--max-pages <number>`**

- **Purpose:** Limit the number of pages to crawl.
- **Default:** `5`
- **Validation:** Must be a positive integer.

**`--delay <ms>`**

- **Purpose:** Set delay (in milliseconds) between requests.
- **Default:** `300ms`
- **Validation:** Must be a positive integer.

**`--output-dir <path>`**

- **Purpose:** Specify the directory to save Markdown files.
- **Default:** Current working directory.
- **Validation:** Must be a writable location.

**`--include <pattern>` / `--exclude <pattern>`**

- **Purpose:** Specify glob patterns for filtering files.
- **Behavior:** Can be used multiple times to specify multiple patterns.
- **Validation:** Must be valid glob patterns.

#### Global Options

**`--help`**

- **Purpose:** Display help information.
- **Behavior:** Shows usage, commands, options, and examples.

**`--version`**

- **Purpose:** Display version number.
- **Behavior:** Outputs version and exits.

## Integration with @fwdslsh/catalog

For users requiring LLMS.txt file generation capabilities, Inform can be used in combination with [`@fwdslsh/catalog`](https://github.com/fwdslsh/catalog). This approach provides:

### Workflow
1. **Content Extraction**: Use Inform to crawl websites or download Git repositories, converting content to clean Markdown format.
2. **LLMS.txt Generation**: Use @fwdslsh/catalog to process the Markdown files and generate LLMS.txt format files.

### Benefits
- **Separation of concerns**: Each tool specializes in its core functionality
- **Enhanced flexibility**: Use any Markdown content with @fwdslsh/catalog
- **Better maintainability**: Focused, single-purpose tools

### Example Integration
```bash
# Step 1: Extract content with Inform
inform https://docs.example.com --output-dir ./content

# Step 2: Generate LLMS.txt with @fwdslsh/catalog
npx @fwdslsh/catalog ./content --output llms.txt
```

## File Processing Rules

### HTML Files

- Extracts main content, headings, and code blocks.
- Converts HTML to Markdown using clean formatting.

### Output Files

- Saved as `.md` files in the output directory.
- Folder structure mirrors the source site.

## Directory Structure Conventions

```
project/
├── src/                      # Source root
│   ├── page.html             # HTML page to crawl
│   └── docs/                 # Documentation folder
│       └── index.html        # Documentation index
└── output/                   # Output directory
    └── page.html.md          # Converted Markdown file
```

## Error Handling

- Invalid URL: Outputs error message and exits with code 2.
- Network errors: Retries request and logs warning.
- Unsupported content: Skips content and logs warning.

## Performance Requirements

### Crawl Performance

- Processes individual pages in <1 second (typical).
- Handles up to 1000 pages per crawl session.

### Resource Usage

- Memory efficient; processes one page at a time.
- Minimal CPU usage during idle periods.

## Compatibility Requirements

### Runtime Support

- Requires Bun runtime (v1.0.0+).
- Cross-platform support for Linux, macOS, and Windows.

## Configuration

- No configuration file required.
- All options provided via CLI.

## Success Criteria

### Functional Requirements

- CLI commands (`crawl`, `help`, `version`) work as expected.
- HTML to Markdown conversion produces clean, readable output.
- Folder structure preservation matches source site.
- Error handling provides clear, actionable messages.

### Performance

- Crawls complete in <1 second per page.
- Handles large sites with 1000+ pages efficiently.

### Usability Requirements

- Intuitive CLI with helpful defaults.
- Comprehensive help documentation.

### Reliability Requirements

- Graceful handling of network errors and invalid input.
- Robust error recovery during crawling.

---

**End of Application Specification**
