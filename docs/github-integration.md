# GitHub Integration Guide

Inform provides powerful capabilities for downloading files and directories from GitHub repositories without needing to clone the entire repository. This is especially useful for extracting documentation, examples, or specific code sections.

## Overview

When you provide a GitHub URL, Inform automatically detects it's in "Git Mode" and uses the GitHub API to download files directly. This is much faster than cloning and more efficient for partial downloads.

## Basic GitHub Usage

### Download Entire Repository

```bash
# Download all files from a repository
inform https://github.com/owner/repository-name

# Example: Download the entire Inform repository
inform https://github.com/fwdslsh/inform --output-dir ./inform-source
```

### Download Specific Directory

This is the core feature requested in the issue - downloading just a single directory:

```bash
# Download only the docs folder from fwdslsh/unify
inform https://github.com/fwdslsh/unify/tree/main/docs --output-dir ./unify-docs

# Download docs from any repository
inform https://github.com/owner/repo/tree/main/docs --output-dir ./docs-only

# Download a nested directory
inform https://github.com/owner/repo/tree/main/src/components --output-dir ./components
```

### Download from Specific Branch

```bash
# Download from a specific branch
inform https://github.com/owner/repo/tree/develop/docs --output-dir ./develop-docs

# Download from a tag
inform https://github.com/owner/repo/tree/v1.2.3/docs --output-dir ./v1.2.3-docs
```

## Practical Examples

### Example 1: fwdslsh/unify Documentation

As specifically mentioned in the issue, here's how to grab only the docs folder from the fwdslsh/unify repository:

```bash
# Download just the docs directory from fwdslsh/unify
inform https://github.com/fwdslsh/unify/tree/main/docs --output-dir ./unify-documentation

# With file filtering for specific types
inform https://github.com/fwdslsh/unify/tree/main/docs --include "*.md" --output-dir ./unify-md-docs

# Exclude certain files
inform https://github.com/fwdslsh/unify/tree/main/docs --exclude "*.tmp" --exclude "draft-*" --output-dir ./unify-final-docs
```

### Example 2: Extract Examples Directory

```bash
# Download examples from a popular framework
inform https://github.com/vercel/next.js/tree/main/examples --output-dir ./nextjs-examples

# Filter for specific examples
inform https://github.com/vercel/next.js/tree/main/examples --include "with-typescript*" --output-dir ./typescript-examples
```

### Example 3: Multi-Directory Download

```bash
# You can run multiple commands to get different directories
inform https://github.com/owner/repo/tree/main/docs --output-dir ./project-docs
inform https://github.com/owner/repo/tree/main/examples --output-dir ./project-examples
inform https://github.com/owner/repo/tree/main/tests --output-dir ./project-tests
```

## Advanced GitHub Features

### File Filtering with GitHub Repos

```bash
# Download only Markdown files from docs
inform https://github.com/owner/repo/tree/main/docs --include "*.md" --output-dir ./markdown-docs

# Download only JavaScript files
inform https://github.com/owner/repo/tree/main/src --include "*.js" --include "*.ts" --output-dir ./source-code

# Exclude node_modules and hidden files
inform https://github.com/owner/repo --exclude "node_modules/**" --exclude ".*" --output-dir ./clean-source

# Complex filtering: only docs, exclude drafts
inform https://github.com/owner/repo/tree/main/docs \
  --include "*.md" \
  --exclude "**/draft-*" \
  --exclude "**/internal/**" \
  --output-dir ./public-docs
```

### Working with Different Repository Structures

```bash
# Monorepo: Download specific package docs
inform https://github.com/owner/monorepo/tree/main/packages/component-lib/docs --output-dir ./component-docs

# Download from subdirectory several levels deep
inform https://github.com/owner/repo/tree/main/frontend/src/components/ui --output-dir ./ui-components

# Download configuration files from root
inform https://github.com/owner/repo --include "*.json" --include "*.yaml" --include "*.yml" --output-dir ./configs
```

## GitHub API Considerations

### Rate Limiting

GitHub API has rate limits (5,000 requests per hour for authenticated, 60 for unauthenticated):

```bash
# For large repositories, consider filtering
inform https://github.com/large-org/huge-repo/tree/main/docs --include "*.md" --output-dir ./docs

# Process in smaller chunks
inform https://github.com/owner/repo/tree/main/docs/getting-started --output-dir ./getting-started
inform https://github.com/owner/repo/tree/main/docs/api --output-dir ./api-docs
```

### Repository Access

```bash
# Public repositories work without authentication
inform https://github.com/public-org/public-repo/tree/main/docs

# For private repositories, you'd need to clone first:
# git clone https://github.com/private-org/private-repo.git
# inform ./private-repo/docs --output-dir ./private-docs
```

## Real-World Use Cases

### 1. Documentation Aggregation

Collect documentation from multiple repositories:

```bash
#!/bin/bash
# Script to collect docs from multiple fwdslsh tools

# Create organized output directory
mkdir -p ./fwdslsh-docs

# Download docs from each tool
inform https://github.com/fwdslsh/inform/tree/main/docs --output-dir ./fwdslsh-docs/inform
inform https://github.com/fwdslsh/unify/tree/main/docs --output-dir ./fwdslsh-docs/unify
inform https://github.com/fwdslsh/catalog/tree/main/docs --output-dir ./fwdslsh-docs/catalog

echo "All fwdslsh documentation downloaded to ./fwdslsh-docs/"
```

### 2. Example Code Collection

```bash
# Collect examples from a framework
inform https://github.com/framework/repo/tree/main/examples --include "*.js" --include "*.ts" --include "*.md" --output-dir ./framework-examples

# Collect only specific example types
inform https://github.com/react-org/react/tree/main/packages/react-dom/src/__tests__ --include "*-test.js" --output-dir ./react-test-examples
```

### 3. Configuration Template Collection

```bash
# Download common configuration templates
inform https://github.com/github/gitignore --include "*.gitignore" --output-dir ./gitignore-templates

# Download Docker examples
inform https://github.com/docker-library/official-images/tree/master --include "Dockerfile" --output-dir ./dockerfile-examples
```

## Integration with Git Workflows

### Automated Documentation Updates

```bash
#!/bin/bash
# Update local docs from upstream repository

REPO_URL="https://github.com/upstream/project"
LOCAL_DOCS="./vendor-docs"

# Clean previous version
rm -rf "$LOCAL_DOCS"

# Download latest docs
inform "$REPO_URL/tree/main/docs" --output-dir "$LOCAL_DOCS"

echo "Documentation updated from $REPO_URL"
```

### Release Documentation

```bash
# Download docs from specific release
inform https://github.com/owner/repo/tree/v2.1.0/docs --output-dir ./v2.1.0-docs

# Compare docs between versions
inform https://github.com/owner/repo/tree/v2.0.0/docs --output-dir ./v2.0.0-docs
inform https://github.com/owner/repo/tree/v2.1.0/docs --output-dir ./v2.1.0-docs
```

## Troubleshooting GitHub Downloads

### Common Issues

1. **404 Errors**: Check repository and path exist
   ```bash
   # Verify the URL exists in browser first
   inform https://github.com/owner/repo/tree/main/docs
   ```

2. **Empty Downloads**: Check directory has files
   ```bash
   # Try without subdirectory first
   inform https://github.com/owner/repo --include "docs/**"
   ```

3. **Rate Limiting**: Add delays or reduce scope
   ```bash
   # Use filtering to reduce API calls
   inform https://github.com/large-repo/huge --include "*.md" --output-dir ./md-only
   ```

### Verification

```bash
# Check what was downloaded
ls -la ./output-directory

# Count files downloaded
find ./output-directory -type f | wc -l

# Check file types
find ./output-directory -type f -name "*" | sort
```

## Next Steps

- [Web Crawling Guide](./web-crawling.md) - Learn about web crawling features
- [Automation & Scripting](./automation-and-scripting.md) - Automate GitHub downloads
- [fwdslsh Ecosystem](./fwdslsh-ecosystem.md) - Combine with other fwdslsh tools