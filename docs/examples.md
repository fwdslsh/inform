# Practical Examples

This guide provides real-world examples and use cases for Inform, showing practical applications for different scenarios and needs.

## Quick Reference Examples

### Basic Usage Patterns

```bash
# Simple website backup
inform https://docs.example.com --output-dir ./backup

# GitHub directory download
inform https://github.com/owner/repo/tree/main/docs --output-dir ./repo-docs

# Large site with rate limiting
inform https://docs.example.com --max-pages 200 --delay 1000 --concurrency 2

# Filtered download
inform https://site.com --include "*.md" --exclude "**/private/**" --output-dir ./filtered
```

## Documentation Migration

### Migrating from GitBook to Static Site

```bash
#!/bin/bash
# gitbook-to-static.sh

GITBOOK_URL="https://company.gitbook.io/documentation"
OUTPUT_DIR="./migrated-docs"
PROCESSED_DIR="./processed-docs"

echo "Migrating GitBook documentation to static format..."

# Step 1: Download all content
inform "$GITBOOK_URL" \
    --output-dir "$OUTPUT_DIR" \
    --max-pages 150 \
    --delay 800 \
    --concurrency 2

# Step 2: Process for static site generator
mkdir -p "$PROCESSED_DIR"

find "$OUTPUT_DIR" -name "*.md" | while read -r file; do
    rel_path="${file#$OUTPUT_DIR/}"
    output_file="$PROCESSED_DIR/$rel_path"
    output_dir=$(dirname "$output_file")
    
    mkdir -p "$output_dir"
    
    # Add frontmatter for static site generator
    {
        echo "---"
        echo "title: $(grep -m1 '^# ' "$file" | sed 's/^# //' || basename "$file" .md)"
        echo "source: GitBook"
        echo "migrated: $(date -Iseconds)"
        echo "---"
        echo
        # Remove the first h1 since it's now in frontmatter
        tail -n +2 "$file" | sed '/^# /d'
    } > "$output_file"
done

echo "Migration complete!"
echo "Original: $OUTPUT_DIR"
echo "Processed: $PROCESSED_DIR"
```

### Confluence to Markdown Migration

```bash
#!/bin/bash
# confluence-to-markdown.sh

CONFLUENCE_SPACE="https://company.atlassian.net/wiki/spaces/DOCS"
OUTPUT_DIR="./confluence-export"

# Note: This assumes you have a publicly accessible Confluence space
# For private spaces, you'd need to handle authentication differently

inform "$CONFLUENCE_SPACE" \
    --output-dir "$OUTPUT_DIR" \
    --max-pages 100 \
    --delay 1500 \
    --concurrency 1  # Be respectful to Confluence

# Clean up Confluence-specific artifacts
find "$OUTPUT_DIR" -name "*.md" -exec sed -i 's/\[confluence-[^]]*\]//g' {} \;

echo "Confluence export complete: $OUTPUT_DIR"
```

## Research and Analysis

### Competitive Documentation Analysis

```bash
#!/bin/bash
# competitive-analysis.sh

declare -A competitors=(
    ["competitor-a"]="https://docs.competitor-a.com"
    ["competitor-b"]="https://docs.competitor-b.com"
    ["competitor-c"]="https://docs.competitor-c.com"
)

ANALYSIS_DIR="./competitive-analysis-$(date +%Y%m%d)"
mkdir -p "$ANALYSIS_DIR"

echo "Starting competitive documentation analysis..."

# Download competitor documentation
for name in "${!competitors[@]}"; do
    url="${competitors[$name]}"
    echo "Analyzing $name documentation..."
    
    inform "$url" \
        --output-dir "$ANALYSIS_DIR/$name" \
        --max-pages 50 \
        --delay 2000 \
        --concurrency 1  # Be very respectful
        
    # Generate quick statistics
    file_count=$(find "$ANALYSIS_DIR/$name" -name "*.md" | wc -l)
    word_count=$(find "$ANALYSIS_DIR/$name" -name "*.md" -exec cat {} \; | wc -w)
    
    echo "$name: $file_count files, $word_count words" >> "$ANALYSIS_DIR/stats.txt"
    
    sleep 120  # Long delay between competitors
done

# Generate analysis report
{
    echo "# Competitive Documentation Analysis"
    echo "Generated: $(date)"
    echo
    echo "## Statistics"
    cat "$ANALYSIS_DIR/stats.txt"
    echo
    echo "## Structure Comparison"
    for name in "${!competitors[@]}"; do
        echo "### $name"
        find "$ANALYSIS_DIR/$name" -name "*.md" | sort
        echo
    done
} > "$ANALYSIS_DIR/analysis-report.md"

echo "Competitive analysis complete: $ANALYSIS_DIR"
```

### Framework Documentation Comparison

```bash
#!/bin/bash
# framework-comparison.sh

frameworks=(
    "react:https://react.dev/"
    "vue:https://vuejs.org/guide/"
    "angular:https://angular.io/docs"
    "svelte:https://svelte.dev/docs"
)

COMPARISON_DIR="./framework-comparison"
mkdir -p "$COMPARISON_DIR"

echo "Comparing frontend framework documentation..."

# Download docs for each framework
for framework_info in "${frameworks[@]}"; do
    IFS=':' read -r name url <<< "$framework_info"
    
    echo "Downloading $name documentation..."
    inform "$url" \
        --output-dir "$COMPARISON_DIR/$name" \
        --max-pages 60 \
        --delay 800 \
        --concurrency 2
        
    sleep 45
done

# Generate comparison matrix
{
    echo "# Framework Documentation Comparison"
    echo "Generated: $(date)"
    echo
    echo "| Framework | Files | Sections | Getting Started | API Docs | Examples |"
    echo "|-----------|-------|----------|-----------------|----------|----------|"
    
    for framework_info in "${frameworks[@]}"; do
        IFS=':' read -r name url <<< "$framework_info"
        
        file_count=$(find "$COMPARISON_DIR/$name" -name "*.md" | wc -l)
        has_getting_started=$(find "$COMPARISON_DIR/$name" -name "*getting*started*" | wc -l)
        has_api=$(find "$COMPARISON_DIR/$name" -name "*api*" | wc -l)
        has_examples=$(find "$COMPARISON_DIR/$name" -name "*example*" | wc -l)
        
        echo "| $name | $file_count | - | $has_getting_started | $has_api | $has_examples |"
    done
} > "$COMPARISON_DIR/comparison-matrix.md"

echo "Framework comparison complete: $COMPARISON_DIR"
```

## Educational Use Cases

### Course Material Collection

```bash
#!/bin/bash
# collect-course-materials.sh

COURSE_NAME="$1"
if [[ -z "$COURSE_NAME" ]]; then
    echo "Usage: $0 <course-name>"
    exit 1
fi

MATERIALS_DIR="./course-materials-$COURSE_NAME"
mkdir -p "$MATERIALS_DIR"

# Common educational resource sites
educational_sources=(
    "https://developer.mozilla.org/en-US/docs/Web"
    "https://web.dev/"
    "https://www.w3schools.com/"
)

echo "Collecting educational materials for $COURSE_NAME..."

for source in "${educational_sources[@]}"; do
    source_name=$(echo "$source" | sed 's|https://||' | tr '.' '-' | tr '/' '-')
    
    echo "Downloading from $source_name..."
    inform "$source" \
        --output-dir "$MATERIALS_DIR/$source_name" \
        --max-pages 40 \
        --delay 1000 \
        --include "*.html" \
        --exclude "**/reference/**"  # Skip detailed reference docs
        
    sleep 30
done

# Organize materials by topic
mkdir -p "$MATERIALS_DIR/organized"/{basics,intermediate,advanced}

# This would typically involve more sophisticated content analysis
# For now, just create the structure
echo "Course materials collected in: $MATERIALS_DIR"
echo "Next step: Organize materials by difficulty level"
```

### Tutorial Aggregation

```bash
#!/bin/bash
# aggregate-tutorials.sh

TOPIC="$1"
if [[ -z "$TOPIC" ]]; then
    echo "Usage: $0 <topic>"
    echo "Example: $0 javascript"
    exit 1
fi

TUTORIALS_DIR="./tutorials-$TOPIC"
mkdir -p "$TUTORIALS_DIR"

# Tutorial sites for different topics
case "$TOPIC" in
    "javascript")
        sites=(
            "https://javascript.info/"
            "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
        )
        ;;
    "python")
        sites=(
            "https://docs.python.org/3/tutorial/"
            "https://realpython.com/"
        )
        ;;
    "react")
        sites=(
            "https://react.dev/learn"
            "https://reactjs.org/tutorial/"
        )
        ;;
    *)
        echo "Topic not configured: $TOPIC"
        exit 1
        ;;
esac

echo "Aggregating $TOPIC tutorials..."

for site in "${sites[@]}"; do
    site_name=$(echo "$site" | sed 's|https://||' | tr '.' '-' | tr '/' '-')
    
    inform "$site" \
        --output-dir "$TUTORIALS_DIR/$site_name" \
        --max-pages 30 \
        --delay 800 \
        --include "*tutorial*" \
        --include "*learn*"
done

echo "Tutorial aggregation complete: $TUTORIALS_DIR"
```

## Content Archival

### Personal Knowledge Base

```bash
#!/bin/bash
# build-knowledge-base.sh

KB_DIR="./knowledge-base"
DATE=$(date +%Y%m%d)

echo "Building personal knowledge base..."

# Technical documentation
mkdir -p "$KB_DIR/tech-docs"

tech_sources=(
    "https://docs.docker.com/"
    "https://kubernetes.io/docs/"
    "https://docs.aws.amazon.com/"
)

for source in "${tech_sources[@]}"; do
    source_name=$(echo "$source" | sed 's|https://||' | sed 's|/.*||' | tr '.' '-')
    
    inform "$source" \
        --output-dir "$KB_DIR/tech-docs/$source_name" \
        --max-pages 50 \
        --delay 1000 \
        --include "**/getting-started/**" \
        --include "**/tutorials/**"
        
    sleep 60
done

# Programming language references
mkdir -p "$KB_DIR/languages"

language_sources=(
    "go:https://golang.org/doc/"
    "rust:https://doc.rust-lang.org/book/"
    "python:https://docs.python.org/3/"
)

for lang_info in "${language_sources[@]}"; do
    IFS=':' read -r lang url <<< "$lang_info"
    
    inform "$url" \
        --output-dir "$KB_DIR/languages/$lang" \
        --max-pages 40 \
        --delay 800
        
    sleep 45
done

# Create master index
{
    echo "# Personal Knowledge Base"
    echo "Last updated: $(date)"
    echo
    echo "## Technical Documentation"
    for dir in "$KB_DIR/tech-docs"/*; do
        if [[ -d "$dir" ]]; then
            name=$(basename "$dir")
            file_count=$(find "$dir" -name "*.md" | wc -l)
            echo "- [$name](./${dir#./}) ($file_count files)"
        fi
    done
    echo
    echo "## Programming Languages"
    for dir in "$KB_DIR/languages"/*; do
        if [[ -d "$dir" ]]; then
            name=$(basename "$dir")
            file_count=$(find "$dir" -name "*.md" | wc -l)
            echo "- [$name](./${dir#./}) ($file_count files)"
        fi
    done
} > "$KB_DIR/index.md"

echo "Knowledge base created: $KB_DIR"
```

### Blog Content Backup

```bash
#!/bin/bash
# backup-blog-content.sh

BLOG_URL="$1"
if [[ -z "$BLOG_URL" ]]; then
    echo "Usage: $0 <blog-url>"
    echo "Example: $0 https://blog.example.com"
    exit 1
fi

BACKUP_DIR="./blog-backup-$(date +%Y%m%d)"
BLOG_NAME=$(echo "$BLOG_URL" | sed 's|https://||' | sed 's|/.*||')

echo "Backing up blog content from $BLOG_URL..."

# Download blog content
inform "$BLOG_URL" \
    --output-dir "$BACKUP_DIR/raw" \
    --max-pages 200 \
    --delay 500 \
    --concurrency 3

# Process blog posts
mkdir -p "$BACKUP_DIR/posts"

find "$BACKUP_DIR/raw" -name "*.md" | while read -r file; do
    # Extract post date if possible from filename or content
    post_date=$(grep -E "^date:|^published:" "$file" | head -1 | sed 's/.*: *//' || echo "unknown")
    
    # Create meaningful filename
    title=$(grep -m1 "^# " "$file" | sed 's/^# //' | tr ' ' '-' | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]//g' || echo "untitled")
    
    if [[ "$post_date" != "unknown" ]]; then
        new_filename="${post_date}-${title}.md"
    else
        new_filename="${title}.md"
    fi
    
    cp "$file" "$BACKUP_DIR/posts/$new_filename"
done

# Create blog archive index
{
    echo "# $BLOG_NAME Archive"
    echo "Archived: $(date)"
    echo "Source: $BLOG_URL"
    echo
    echo "## Posts"
    for post in "$BACKUP_DIR/posts"/*.md; do
        if [[ -f "$post" ]]; then
            title=$(grep -m1 "^# " "$post" | sed 's/^# //' || basename "$post" .md)
            echo "- [$title](./posts/$(basename "$post"))"
        fi
    done
} > "$BACKUP_DIR/index.md"

echo "Blog backup complete: $BACKUP_DIR"
echo "Total posts: $(find "$BACKUP_DIR/posts" -name "*.md" | wc -l)"
```

## Development Workflows

### Documentation-Driven Development

```bash
#!/bin/bash
# docs-driven-development.sh

PROJECT_NAME="$1"
if [[ -z "$PROJECT_NAME" ]]; then
    echo "Usage: $0 <project-name>"
    exit 1
fi

RESEARCH_DIR="./docs-research-$PROJECT_NAME"
mkdir -p "$RESEARCH_DIR"

echo "Starting documentation research for $PROJECT_NAME..."

# Research similar projects
similar_projects=(
    "https://github.com/similar-project-1/docs"
    "https://github.com/similar-project-2/docs"
    "https://docs.established-tool.com"
)

for project in "${similar_projects[@]}"; do
    project_name=$(echo "$project" | sed 's|.*/||' | tr '.' '-')
    
    inform "$project" \
        --output-dir "$RESEARCH_DIR/research/$project_name" \
        --max-pages 30 \
        --delay 600
done

# Create documentation structure based on research
mkdir -p "$RESEARCH_DIR/template"/{getting-started,api,guides,examples}

# Generate documentation template
cat > "$RESEARCH_DIR/template/index.md" << EOF
# $PROJECT_NAME Documentation

## Getting Started
- [Installation](./getting-started/installation.md)
- [Quick Start](./getting-started/quick-start.md)
- [Basic Usage](./getting-started/basic-usage.md)

## API Reference
- [Core API](./api/core.md)
- [Configuration](./api/configuration.md)
- [Events](./api/events.md)

## Guides
- [Best Practices](./guides/best-practices.md)
- [Troubleshooting](./guides/troubleshooting.md)
- [Migration Guide](./guides/migration.md)

## Examples
- [Basic Examples](./examples/basic.md)
- [Advanced Usage](./examples/advanced.md)
- [Integration Examples](./examples/integration.md)
EOF

echo "Documentation research complete: $RESEARCH_DIR"
echo "Template created: $RESEARCH_DIR/template/"
```

### API Documentation Collection

```bash
#!/bin/bash
# collect-api-docs.sh

SERVICE_NAME="$1"
if [[ -z "$SERVICE_NAME" ]]; then
    echo "Usage: $0 <service-name>"
    exit 1
fi

API_DOCS_DIR="./api-docs-$SERVICE_NAME"
mkdir -p "$API_DOCS_DIR"

# Common API documentation patterns
api_endpoints=(
    "https://$SERVICE_NAME.com/docs"
    "https://docs.$SERVICE_NAME.com"
    "https://api.$SERVICE_NAME.com/docs"
    "https://developers.$SERVICE_NAME.com"
)

echo "Collecting API documentation for $SERVICE_NAME..."

for endpoint in "${api_endpoints[@]}"; do
    endpoint_name=$(echo "$endpoint" | sed 's|https://||' | tr '.' '-' | tr '/' '-')
    
    # Check if endpoint exists before downloading
    if curl -s --head "$endpoint" | head -n 1 | grep -q "200 OK"; then
        echo "Downloading from $endpoint..."
        
        inform "$endpoint" \
            --output-dir "$API_DOCS_DIR/$endpoint_name" \
            --max-pages 50 \
            --delay 800 \
            --include "**/api/**" \
            --include "**/reference/**"
    else
        echo "Endpoint not found: $endpoint"
    fi
    
    sleep 30
done

# Generate API documentation index
{
    echo "# $SERVICE_NAME API Documentation"
    echo "Collected: $(date)"
    echo
    for dir in "$API_DOCS_DIR"/*; do
        if [[ -d "$dir" ]]; then
            name=$(basename "$dir")
            file_count=$(find "$dir" -name "*.md" | wc -l)
            if [[ $file_count -gt 0 ]]; then
                echo "## $name ($file_count files)"
                find "$dir" -name "*.md" | head -10 | while read -r file; do
                    title=$(grep -m1 "^# " "$file" | sed 's/^# //' || basename "$file" .md)
                    echo "- [$title](./${file#./})"
                done
                echo
            fi
        fi
    done
} > "$API_DOCS_DIR/index.md"

echo "API documentation collection complete: $API_DOCS_DIR"
```

## Specialized Use Cases

### Conference Talk Research

```bash
#!/bin/bash
# conference-research.sh

CONFERENCE_TOPIC="$1"
if [[ -z "$CONFERENCE_TOPIC" ]]; then
    echo "Usage: $0 <conference-topic>"
    echo "Example: $0 machine-learning"
    exit 1
fi

RESEARCH_DIR="./conference-research-$CONFERENCE_TOPIC"
mkdir -p "$RESEARCH_DIR"

# Conference sites often have documentation
conference_sites=(
    "https://nips.cc/"
    "https://icml.cc/"
    "https://iclr.cc/"
)

echo "Researching $CONFERENCE_TOPIC content..."

for site in "${conference_sites[@]}"; do
    site_name=$(echo "$site" | sed 's|https://||' | sed 's|/.*||')
    
    inform "$site" \
        --output-dir "$RESEARCH_DIR/$site_name" \
        --max-pages 20 \
        --delay 1000 \
        --include "**/papers/**" \
        --include "**/proceedings/**"
        
    sleep 60
done

echo "Conference research complete: $RESEARCH_DIR"
```

### Compliance Documentation

```bash
#!/bin/bash
# collect-compliance-docs.sh

COMPLIANCE_TYPE="$1"
if [[ -z "$COMPLIANCE_TYPE" ]]; then
    echo "Usage: $0 <compliance-type>"
    echo "Examples: gdpr, hipaa, sox, iso27001"
    exit 1
fi

COMPLIANCE_DIR="./compliance-$COMPLIANCE_TYPE"
mkdir -p "$COMPLIANCE_DIR"

# Compliance documentation sources
case "$COMPLIANCE_TYPE" in
    "gdpr")
        sources=(
            "https://gdpr.eu/"
            "https://gdpr-info.eu/"
        )
        ;;
    "hipaa")
        sources=(
            "https://www.hhs.gov/hipaa/"
        )
        ;;
    *)
        echo "Compliance type not configured: $COMPLIANCE_TYPE"
        exit 1
        ;;
esac

echo "Collecting $COMPLIANCE_TYPE compliance documentation..."

for source in "${sources[@]}"; do
    source_name=$(echo "$source" | sed 's|https://||' | tr '.' '-' | tr '/' '-')
    
    inform "$source" \
        --output-dir "$COMPLIANCE_DIR/$source_name" \
        --max-pages 50 \
        --delay 1500 \
        --concurrency 1  # Be respectful to official sites
        
    sleep 90
done

echo "Compliance documentation collected: $COMPLIANCE_DIR"
```

## Monitoring and Maintenance

### Documentation Health Check

```bash
#!/bin/bash
# docs-health-check.sh

DOCS_DIR="$1"
if [[ ! -d "$DOCS_DIR" ]]; then
    echo "Usage: $0 <docs-directory>"
    exit 1
fi

REPORT_FILE="./docs-health-report-$(date +%Y%m%d).md"

{
    echo "# Documentation Health Report"
    echo "Generated: $(date)"
    echo "Directory: $DOCS_DIR"
    echo
    
    # File statistics
    total_files=$(find "$DOCS_DIR" -name "*.md" | wc -l)
    total_size=$(du -sh "$DOCS_DIR" | cut -f1)
    
    echo "## Statistics"
    echo "- Total files: $total_files"
    echo "- Total size: $total_size"
    echo
    
    # Check for empty files
    empty_files=$(find "$DOCS_DIR" -name "*.md" -empty)
    if [[ -n "$empty_files" ]]; then
        echo "## Empty Files"
        echo "$empty_files" | while read -r file; do
            echo "- $file"
        done
        echo
    fi
    
    # Check for broken links (simple check)
    echo "## Potential Issues"
    broken_links=$(find "$DOCS_DIR" -name "*.md" -exec grep -l "404\|error\|not found" {} \;)
    if [[ -n "$broken_links" ]]; then
        echo "### Files with potential errors:"
        echo "$broken_links" | while read -r file; do
            echo "- $file"
        done
    else
        echo "No obvious issues found."
    fi
    
} > "$REPORT_FILE"

echo "Health report generated: $REPORT_FILE"
```

These examples demonstrate the versatility of Inform across different domains and use cases. Each script can be adapted and extended based on specific needs and requirements.

## Next Steps

- [Getting Started](./getting-started.md) - Basic usage guide
- [GitHub Integration](./github-integration.md) - Repository-specific features
- [Web Crawling](./web-crawling.md) - Advanced web crawling
- [Automation & Scripting](./automation-and-scripting.md) - Advanced automation
- [fwdslsh Ecosystem](./fwdslsh-ecosystem.md) - Tool integration