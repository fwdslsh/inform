# Automation & Scripting with Inform

This guide shows how to integrate Inform into automation workflows, CI/CD pipelines, and custom scripts for advanced documentation management and content processing.

## Overview

Inform's command-line interface makes it perfect for automation. You can integrate it into shell scripts, CI/CD pipelines, cron jobs, and custom workflows to automate documentation collection, content analysis, and more.

## Basic Automation Patterns

### Simple Backup Scripts

```bash
#!/bin/bash
# basic-backup.sh - Simple documentation backup

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="./backups/docs_$TIMESTAMP"

# Create backup directory
mkdir -p "$OUTPUT_DIR"

# Download documentation
inform https://docs.example.com \
  --output-dir "$OUTPUT_DIR" \
  --max-pages 200 \
  --delay 500

# Create archive
tar -czf "docs_backup_$TIMESTAMP.tar.gz" "$OUTPUT_DIR"

echo "Backup completed: docs_backup_$TIMESTAMP.tar.gz"
```

### Multi-Site Collection

```bash
#!/bin/bash
# collect-multiple-docs.sh - Collect from multiple sources

declare -A SITES=(
  ["react"]="https://react.dev/"
  ["vue"]="https://vuejs.org/guide/"
  ["angular"]="https://angular.io/docs"
  ["svelte"]="https://svelte.dev/docs"
)

BASE_DIR="./framework-docs"
mkdir -p "$BASE_DIR"

for framework in "${!SITES[@]}"; do
  echo "Downloading $framework documentation..."
  
  inform "${SITES[$framework]}" \
    --output-dir "$BASE_DIR/$framework" \
    --max-pages 100 \
    --delay 800 \
    --concurrency 2
    
  # Wait between downloads to be respectful
  sleep 30
done

echo "All framework documentation downloaded to $BASE_DIR"
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/docs-sync.yml
name: Documentation Sync

on:
  schedule:
    # Run daily at 2 AM UTC
    - cron: '0 2 * * *'
  workflow_dispatch:

jobs:
  sync-docs:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout repository
      uses: actions/checkout@v4
      
    - name: Install Inform
      run: |
        curl -fsSL https://raw.githubusercontent.com/fwdslsh/inform/main/install.sh | sh
        
    - name: Download external documentation
      run: |
        # Download API documentation
        inform https://api.example.com/docs \
          --output-dir ./external-docs/api \
          --max-pages 50 \
          --delay 1000
          
        # Download integration guides
        inform https://github.com/partner/docs/tree/main/integration \
          --output-dir ./external-docs/integrations
          
    - name: Commit updated documentation
      run: |
        git config --local user.email "action@github.com"
        git config --local user.name "GitHub Action"
        git add ./external-docs
        git diff --staged --quiet || git commit -m "Update external documentation $(date +%Y-%m-%d)"
        git push
```

### GitLab CI Pipeline

```yaml
# .gitlab-ci.yml
stages:
  - sync-docs

sync-external-docs:
  stage: sync-docs
  image: ubuntu:latest
  before_script:
    - apt-get update && apt-get install -y curl
    - curl -fsSL https://raw.githubusercontent.com/fwdslsh/inform/main/install.sh | sh
  script:
    - ./scripts/sync-docs.sh
  artifacts:
    paths:
      - external-docs/
    expire_in: 1 week
  only:
    - schedules
```

### Jenkins Pipeline

```groovy
// Jenkinsfile
pipeline {
    agent any
    
    triggers {
        cron('H 2 * * *')  // Daily at 2 AM
    }
    
    stages {
        stage('Install Inform') {
            steps {
                sh 'curl -fsSL https://raw.githubusercontent.com/fwdslsh/inform/main/install.sh | sh'
            }
        }
        
        stage('Download Documentation') {
            steps {
                script {
                    sh '''
                        inform https://docs.example.com \
                          --output-dir ./docs-backup \
                          --max-pages 200 \
                          --delay 500
                    '''
                }
            }
        }
        
        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: 'docs-backup/**', fingerprint: true
            }
        }
    }
}
```

## Advanced Automation Scripts

### Intelligent Documentation Sync

```bash
#!/bin/bash
# smart-docs-sync.sh - Intelligent documentation synchronization

set -e

CONFIG_FILE="./docs-sources.json"
OUTPUT_BASE="./synced-docs"
LOG_FILE="./sync.log"

# Load configuration
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Creating default configuration..."
    cat > "$CONFIG_FILE" << 'EOF'
{
  "sources": [
    {
      "name": "main-docs",
      "url": "https://docs.example.com",
      "max_pages": 200,
      "delay": 500,
      "enabled": true
    },
    {
      "name": "api-docs", 
      "url": "https://api.example.com/docs",
      "max_pages": 100,
      "delay": 800,
      "enabled": true
    }
  ]
}
EOF
fi

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to download from a source
download_source() {
    local name="$1"
    local url="$2"
    local max_pages="$3"
    local delay="$4"
    local output_dir="$OUTPUT_BASE/$name"
    
    log "Starting download: $name from $url"
    
    # Create timestamped backup of existing content
    if [[ -d "$output_dir" ]]; then
        backup_dir="${output_dir}_backup_$(date +%Y%m%d_%H%M%S)"
        mv "$output_dir" "$backup_dir"
        log "Backed up existing content to $backup_dir"
    fi
    
    # Download new content
    if inform "$url" \
        --output-dir "$output_dir" \
        --max-pages "$max_pages" \
        --delay "$delay" \
        --concurrency 2; then
        log "Successfully downloaded: $name"
        return 0
    else
        log "ERROR: Failed to download $name"
        # Restore backup if download failed
        if [[ -d "$backup_dir" ]]; then
            mv "$backup_dir" "$output_dir"
            log "Restored backup for $name"
        fi
        return 1
    fi
}

# Main execution
log "Starting documentation sync"

# Parse JSON and process each source
sources=$(cat "$CONFIG_FILE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for source in data['sources']:
    if source.get('enabled', True):
        print(f\"{source['name']}|{source['url']}|{source.get('max_pages', 100)}|{source.get('delay', 500)}\")
")

success_count=0
total_count=0

while IFS='|' read -r name url max_pages delay; do
    if [[ -n "$name" ]]; then
        total_count=$((total_count + 1))
        if download_source "$name" "$url" "$max_pages" "$delay"; then
            success_count=$((success_count + 1))
        fi
        # Wait between sources
        sleep 60
    fi
done <<< "$sources"

log "Sync completed: $success_count/$total_count sources successful"

# Generate summary report
cat > "$OUTPUT_BASE/sync-report.txt" << EOF
Documentation Sync Report
========================
Date: $(date)
Sources processed: $total_count
Successful downloads: $success_count
Failed downloads: $((total_count - success_count))

EOF

# List downloaded content
for dir in "$OUTPUT_BASE"/*; do
    if [[ -d "$dir" && "$(basename "$dir")" != "*_backup_*" ]]; then
        name=$(basename "$dir")
        file_count=$(find "$dir" -type f -name "*.md" | wc -l)
        echo "$name: $file_count files" >> "$OUTPUT_BASE/sync-report.txt"
    fi
done

log "Sync report generated: $OUTPUT_BASE/sync-report.txt"
```

### Content Processing Pipeline

```bash
#!/bin/bash
# content-pipeline.sh - Download and process content

set -e

SOURCE_URL="$1"
PROCESSING_DIR="./processing"
OUTPUT_DIR="./processed-content"

if [[ -z "$SOURCE_URL" ]]; then
    echo "Usage: $0 <source-url>"
    exit 1
fi

# Step 1: Download content
echo "Step 1: Downloading content..."
inform "$SOURCE_URL" \
  --output-dir "$PROCESSING_DIR/raw" \
  --max-pages 100 \
  --delay 500

# Step 2: Process markdown files
echo "Step 2: Processing markdown files..."
mkdir -p "$OUTPUT_DIR"

find "$PROCESSING_DIR/raw" -name "*.md" | while read -r file; do
    rel_path="${file#$PROCESSING_DIR/raw/}"
    output_file="$OUTPUT_DIR/$rel_path"
    output_dir=$(dirname "$output_file")
    
    mkdir -p "$output_dir"
    
    # Process the file (example: add frontmatter, clean up)
    {
        echo "---"
        echo "source: $SOURCE_URL"
        echo "downloaded: $(date -Iseconds)"
        echo "original_path: $rel_path"
        echo "---"
        echo
        cat "$file"
    } > "$output_file"
done

# Step 3: Generate index
echo "Step 3: Generating index..."
{
    echo "# Content Index"
    echo
    echo "Generated: $(date)"
    echo "Source: $SOURCE_URL"
    echo
    echo "## Files"
    echo
    find "$OUTPUT_DIR" -name "*.md" | sort | while read -r file; do
        rel_path="${file#$OUTPUT_DIR/}"
        title=$(grep -m1 "^# " "$file" 2>/dev/null | sed 's/^# //' || echo "$rel_path")
        echo "- [$title](./$rel_path)"
    done
} > "$OUTPUT_DIR/index.md"

echo "Processing complete: $OUTPUT_DIR"
echo "Files processed: $(find "$OUTPUT_DIR" -name "*.md" | wc -l)"
```

## Monitoring and Alerting

### Health Check Script

```bash
#!/bin/bash
# docs-health-check.sh - Monitor documentation freshness

DOCS_DIR="./docs"
MAX_AGE_HOURS=48
WEBHOOK_URL="${SLACK_WEBHOOK_URL:-}"

# Function to send alert
send_alert() {
    local message="$1"
    echo "ALERT: $message"
    
    if [[ -n "$WEBHOOK_URL" ]]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"📚 Docs Alert: $message\"}" \
            "$WEBHOOK_URL"
    fi
}

# Check if docs exist
if [[ ! -d "$DOCS_DIR" ]]; then
    send_alert "Documentation directory not found: $DOCS_DIR"
    exit 1
fi

# Check freshness
oldest_file=$(find "$DOCS_DIR" -name "*.md" -printf '%T@ %p\n' | sort -n | head -1)
if [[ -n "$oldest_file" ]]; then
    oldest_timestamp=$(echo "$oldest_file" | cut -d' ' -f1)
    current_timestamp=$(date +%s)
    age_hours=$(( (current_timestamp - ${oldest_timestamp%.*}) / 3600 ))
    
    if [[ $age_hours -gt $MAX_AGE_HOURS ]]; then
        send_alert "Documentation is $age_hours hours old (max: $MAX_AGE_HOURS)"
        exit 1
    fi
fi

# Check file count
file_count=$(find "$DOCS_DIR" -name "*.md" | wc -l)
if [[ $file_count -lt 10 ]]; then
    send_alert "Low file count: $file_count files found"
    exit 1
fi

echo "Documentation health check passed: $file_count files, newest is $age_hours hours old"
```

### Cron Job Setup

```bash
# Add to crontab (crontab -e)

# Daily documentation sync at 2 AM
0 2 * * * /path/to/smart-docs-sync.sh >> /var/log/docs-sync.log 2>&1

# Health check every 4 hours
0 */4 * * * /path/to/docs-health-check.sh

# Weekly comprehensive backup
0 1 * * 0 /path/to/weekly-backup.sh
```

## Integration with Development Workflows

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit - Update docs before committing

# Check if we're committing documentation changes
if git diff --cached --name-only | grep -q "^docs/"; then
    echo "Documentation changes detected, updating external references..."
    
    # Update external documentation references
    ./scripts/update-external-docs.sh
    
    # Add any generated files
    git add docs/external/
fi
```

### Release Documentation

```bash
#!/bin/bash
# release-docs.sh - Generate release documentation

VERSION="$1"
if [[ -z "$VERSION" ]]; then
    echo "Usage: $0 <version>"
    exit 1
fi

RELEASE_DIR="./releases/$VERSION"
mkdir -p "$RELEASE_DIR"

# Download current state of all documentation
sources=(
    "https://docs.example.com"
    "https://api.example.com/docs"
    "https://github.com/company/examples/tree/main/docs"
)

for source in "${sources[@]}"; do
    source_name=$(echo "$source" | sed 's|https://||' | tr '/' '_' | tr '.' '_')
    
    inform "$source" \
        --output-dir "$RELEASE_DIR/$source_name" \
        --max-pages 100 \
        --delay 500
done

# Create release archive
tar -czf "docs-$VERSION.tar.gz" "$RELEASE_DIR"

echo "Release documentation created: docs-$VERSION.tar.gz"
```

## Error Handling and Resilience

### Robust Download Script

```bash
#!/bin/bash
# robust-download.sh - Download with retry and error handling

MAX_RETRIES=3
RETRY_DELAY=60

download_with_retry() {
    local url="$1"
    local output_dir="$2"
    local max_pages="$3"
    local delay="$4"
    
    for attempt in $(seq 1 $MAX_RETRIES); do
        echo "Attempt $attempt/$MAX_RETRIES for $url"
        
        if inform "$url" \
            --output-dir "$output_dir" \
            --max-pages "$max_pages" \
            --delay "$delay" \
            --concurrency 2; then
            echo "Successfully downloaded: $url"
            return 0
        else
            echo "Failed attempt $attempt for $url"
            if [[ $attempt -lt $MAX_RETRIES ]]; then
                echo "Waiting ${RETRY_DELAY}s before retry..."
                sleep $RETRY_DELAY
            fi
        fi
    done
    
    echo "All attempts failed for: $url"
    return 1
}

# Usage
download_with_retry "https://docs.example.com" "./docs" 100 500
```

### Validation and Cleanup

```bash
#!/bin/bash
# validate-and-cleanup.sh - Validate downloaded content

DOCS_DIR="$1"
if [[ ! -d "$DOCS_DIR" ]]; then
    echo "Usage: $0 <docs-directory>"
    exit 1
fi

echo "Validating downloaded content in $DOCS_DIR..."

# Check for empty files
empty_files=$(find "$DOCS_DIR" -name "*.md" -empty)
if [[ -n "$empty_files" ]]; then
    echo "Warning: Found empty files:"
    echo "$empty_files"
fi

# Check for files with errors
error_files=$(find "$DOCS_DIR" -name "*.md" -exec grep -l "404\|error\|not found" {} \;)
if [[ -n "$error_files" ]]; then
    echo "Warning: Found files with errors:"
    echo "$error_files"
fi

# Generate statistics
total_files=$(find "$DOCS_DIR" -name "*.md" | wc -l)
total_size=$(du -sh "$DOCS_DIR" | cut -f1)

echo "Validation complete:"
echo "  Total files: $total_files"
echo "  Total size: $total_size"
echo "  Empty files: $(echo "$empty_files" | wc -l)"
echo "  Error files: $(echo "$error_files" | wc -l)"
```

## Performance Optimization

### Parallel Processing

```bash
#!/bin/bash
# parallel-downloads.sh - Download multiple sources in parallel

declare -a PIDS=()
declare -a SOURCES=(
    "https://docs.framework1.com"
    "https://docs.framework2.com" 
    "https://api.service.com/docs"
)

# Start all downloads in background
for i in "${!SOURCES[@]}"; do
    source="${SOURCES[$i]}"
    output_dir="./downloads/source_$i"
    
    echo "Starting download: $source"
    (
        inform "$source" \
            --output-dir "$output_dir" \
            --max-pages 50 \
            --delay 800 \
            --concurrency 2
        echo "Completed: $source"
    ) &
    
    PIDS+=($!)
done

# Wait for all downloads to complete
echo "Waiting for all downloads to complete..."
for pid in "${PIDS[@]}"; do
    wait "$pid"
done

echo "All downloads completed"
```

## Next Steps

- [fwdslsh Ecosystem](./fwdslsh-ecosystem.md) - Integration with other fwdslsh tools
- [Examples](./examples.md) - More practical examples
- [Getting Started](./getting-started.md) - Basic usage guide