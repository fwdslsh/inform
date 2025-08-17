# Web Crawling Guide

This guide covers Inform's web crawling capabilities, including advanced techniques and real-world examples like downloading all pages from documentation sites such as Scala Play Framework 2.9.

## Overview

Web crawling mode activates automatically when you provide HTTP/HTTPS URLs. Inform follows links within the same domain, converts HTML to clean Markdown, and preserves the site's folder structure.

## Basic Web Crawling

### Simple Website Crawling

```bash
# Basic crawling - follows all links on the domain
inform https://docs.example.com

# Crawl with output directory
inform https://docs.example.com --output-dir ./docs-backup

# Limit the number of pages
inform https://docs.example.com --max-pages 50
```

### Controlling Crawl Behavior

```bash
# Add delay between requests (respectful crawling)
inform https://docs.example.com --delay 1000

# Reduce concurrency for smaller sites
inform https://docs.example.com --concurrency 2

# Increase concurrency for robust sites
inform https://docs.example.com --concurrency 5 --delay 200
```

## Advanced Crawling Examples

### Example 1: Scala Play Framework 2.9 Documentation

As specifically requested in the issue, here's how to download all pages from Scala Play 2.9 documentation:

```bash
# Download all Scala Play 2.9 documentation
inform https://www.playframework.com/documentation/2.9.x/ \
  --output-dir ./play-2.9-docs \
  --max-pages 500 \
  --delay 500 \
  --concurrency 3

# More conservative approach with higher delay
inform https://www.playframework.com/documentation/2.9.x/ \
  --output-dir ./play-2.9-docs-safe \
  --max-pages 200 \
  --delay 1000 \
  --concurrency 2

# Download only specific sections
inform https://www.playframework.com/documentation/2.9.x/ScalaHome \
  --output-dir ./play-scala-docs \
  --max-pages 100 \
  --delay 500
```

### Example 2: Framework Documentation Sites

```bash
# Vue.js documentation
inform https://vuejs.org/guide/ \
  --output-dir ./vue-docs \
  --max-pages 100 \
  --delay 300

# React documentation
inform https://react.dev/ \
  --output-dir ./react-docs \
  --max-pages 150 \
  --delay 400

# Express.js documentation
inform https://expressjs.com/ \
  --output-dir ./express-docs \
  --max-pages 80 \
  --delay 500
```

### Example 3: API Documentation

```bash
# Stripe API documentation
inform https://stripe.com/docs \
  --output-dir ./stripe-api-docs \
  --max-pages 300 \
  --delay 600 \
  --concurrency 2

# GitHub API documentation
inform https://docs.github.com/en/rest \
  --output-dir ./github-api-docs \
  --max-pages 200 \
  --delay 500
```

## Crawling Strategies

### 1. Full Site Crawling

For comprehensive documentation backup:

```bash
# Complete documentation site
inform https://docs.framework.com \
  --output-dir ./complete-docs \
  --max-pages 1000 \
  --delay 500 \
  --concurrency 3

# Monitor progress and adjust as needed
# Check output directory periodically: ls -la ./complete-docs
```

### 2. Selective Crawling

Target specific sections:

```bash
# Start from a specific section
inform https://docs.framework.com/guides/ \
  --output-dir ./guides-only \
  --max-pages 100

# Multiple targeted crawls
inform https://docs.framework.com/api/ --output-dir ./api-docs --max-pages 50
inform https://docs.framework.com/tutorials/ --output-dir ./tutorials --max-pages 30
inform https://docs.framework.com/examples/ --output-dir ./examples --max-pages 20
```

### 3. Incremental Crawling

For regular updates:

```bash
#!/bin/bash
# Daily documentation update script

DATE=$(date +%Y%m%d)
OUTPUT_DIR="./docs-backup-$DATE"

inform https://docs.framework.com \
  --output-dir "$OUTPUT_DIR" \
  --max-pages 200 \
  --delay 1000 \
  --concurrency 2

echo "Documentation backup completed: $OUTPUT_DIR"
```

## Content Preservation

### HTML to Markdown Conversion

Inform automatically converts HTML to clean Markdown:

```html
<!-- Input HTML -->
<h1>API Reference</h1>
<p>This is the main API documentation.</p>
<pre><code class="language-javascript">
const api = require('api');
api.get('/users');
</code></pre>
```

```markdown
<!-- Output Markdown -->
# API Reference

This is the main API documentation.

```javascript
const api = require('api');
api.get('/users');
```

### Raw HTML Mode

Keep original HTML when needed:

```bash
# Preserve original HTML structure
inform https://docs.example.com --raw --output-dir ./raw-html-docs

# Useful for:
# - Complex formatting that doesn't convert well
# - Sites with custom CSS/JS that affects content
# - When you need exact HTML structure
```

## Performance Optimization

### Tuning for Different Sites

```bash
# Large, robust sites (like major documentation)
inform https://docs.major-platform.com \
  --concurrency 5 \
  --delay 200 \
  --max-pages 500

# Smaller sites or personal blogs
inform https://personal-blog.com \
  --concurrency 2 \
  --delay 1000 \
  --max-pages 100

# Very large sites (be careful!)
inform https://huge-docs-site.com \
  --concurrency 3 \
  --delay 800 \
  --max-pages 1000
```

### Monitoring Progress

```bash
# Run in background and monitor
inform https://docs.example.com --max-pages 500 --output-dir ./docs &

# Check progress periodically
watch -n 10 'find ./docs -name "*.md" | wc -l'

# Or use a simple progress script
#!/bin/bash
while true; do
  count=$(find ./docs -name "*.md" | wc -l)
  echo "$(date): $count files downloaded"
  sleep 30
done
```

## Handling Special Cases

### JavaScript-Heavy Sites

Some sites require JavaScript for content:

```bash
# For static sites, standard crawling works
inform https://static-docs.com --output-dir ./static-docs

# For JS-heavy sites, look for alternative URLs:
# - Check for /sitemap.xml
# - Look for direct documentation URLs
# - Try different entry points
```

### Authentication Required

For sites requiring authentication:

```bash
# Public documentation sections
inform https://platform.com/docs --output-dir ./public-docs

# For authenticated sections, consider:
# 1. Manual export from the platform
# 2. Using browser automation tools
# 3. API-based export if available
```

### Rate Limiting and Blocks

Handle sites with strict rate limiting:

```bash
# Very conservative crawling
inform https://strict-site.com \
  --delay 2000 \
  --concurrency 1 \
  --max-pages 50

# Spread across multiple sessions
inform https://site.com/section1 --delay 1500 --max-pages 25 --output-dir ./section1
# Wait a few minutes
inform https://site.com/section2 --delay 1500 --max-pages 25 --output-dir ./section2
```

## Real-World Use Cases

### 1. Documentation Migration

Moving from one platform to another:

```bash
#!/bin/bash
# Migrate documentation from old platform

OLD_SITE="https://old-docs.company.com"
NEW_CONTENT="./migrated-content"

# Download all content
inform "$OLD_SITE" \
  --output-dir "$NEW_CONTENT" \
  --max-pages 300 \
  --delay 500

# Process the markdown files for new platform
# (additional processing would go here)

echo "Migration content ready in $NEW_CONTENT"
```

### 2. Competitive Analysis

Analyze competitor documentation:

```bash
# Download competitor docs for analysis
inform https://competitor.com/docs \
  --output-dir ./competitor-analysis \
  --max-pages 100 \
  --delay 1000

# Analyze structure
find ./competitor-analysis -name "*.md" | head -20
```

### 3. Offline Documentation

Create offline copies for travel or limited connectivity:

```bash
# Essential framework docs for offline use
inform https://framework.com/docs \
  --output-dir ./offline-docs \
  --max-pages 200 \
  --delay 500

# Package for distribution
tar -czf offline-docs.tar.gz ./offline-docs
```

### 4. Documentation Archival

Archive documentation for specific versions:

```bash
# Archive current version before major release
inform https://docs.product.com \
  --output-dir "./archive-v$(date +%Y%m%d)" \
  --max-pages 500 \
  --delay 400

# Archive release-specific docs
inform https://docs.product.com/v2.1 \
  --output-dir ./archive-v2.1 \
  --max-pages 100
```

## Automation Scripts

### Daily Backup Script

```bash
#!/bin/bash
# daily-docs-backup.sh

DATE=$(date +%Y%m%d)
SITES=(
  "https://docs.framework1.com"
  "https://docs.framework2.com"
  "https://api.service.com/docs"
)

for site in "${SITES[@]}"; do
  sitename=$(echo "$site" | sed 's|https://||' | sed 's|/.*||' | tr '.' '-')
  output_dir="./backups/$DATE/$sitename"
  
  echo "Backing up $site to $output_dir"
  inform "$site" \
    --output-dir "$output_dir" \
    --max-pages 100 \
    --delay 800 \
    --concurrency 2
    
  sleep 60  # Wait between sites
done

echo "Daily backup completed: ./backups/$DATE/"
```

### Selective Update Script

```bash
#!/bin/bash
# update-docs-sections.sh

BASE_URL="https://docs.example.com"
SECTIONS=("getting-started" "api" "guides" "examples")

for section in "${SECTIONS[@]}"; do
  echo "Updating $section documentation..."
  inform "$BASE_URL/$section" \
    --output-dir "./docs/$section" \
    --max-pages 50 \
    --delay 500
done
```

## Troubleshooting Web Crawling

### Common Issues

1. **Too Many Pages**: Use `--max-pages` to limit scope
   ```bash
   inform https://huge-site.com --max-pages 100
   ```

2. **Rate Limiting**: Increase delays
   ```bash
   inform https://site.com --delay 2000 --concurrency 1
   ```

3. **Missing Content**: Check if site requires JavaScript
   ```bash
   # Try different entry points
   inform https://site.com/sitemap
   ```

4. **Blocked Requests**: Use more conservative settings
   ```bash
   inform https://site.com --delay 3000 --concurrency 1 --max-pages 20
   ```

### Verification

```bash
# Check what was downloaded
find ./output-dir -name "*.md" | wc -l

# Verify content quality
head -20 ./output-dir/index.md

# Check for errors in filenames
find ./output-dir -name "*error*" -o -name "*404*"
```

## Next Steps

- [GitHub Integration](./github-integration.md) - Download from repositories
- [Automation & Scripting](./automation-and-scripting.md) - Advanced automation
- [fwdslsh Ecosystem](./fwdslsh-ecosystem.md) - Integration with other tools