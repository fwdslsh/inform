# fwdslsh Ecosystem Integration

This guide shows how to integrate Inform with other fwdslsh tools like `unify`, `catalog`, and `lift` to create powerful documentation workflows and content processing pipelines.

## Overview

The fwdslsh ecosystem consists of complementary tools designed to work together:

- **Inform** - Web crawler and GitHub repository downloader (this tool)
- **Unify** - Documentation aggregation and organization tool
- **Catalog** - Content indexing and discovery system  
- **Lift** - LLMS.txt file generation for AI/LLM workflows

## Tool Combinations

### Inform + Lift Workflow

The most common integration is using Inform to crawl content and then Lift to generate LLMS.txt files:

```bash
# Step 1: Crawl documentation with Inform
inform https://docs.example.com --output-dir ./docs-content --max-pages 100

# Step 2: Generate LLMS.txt files with Lift
npx @fwdslsh/lift ./docs-content --output llms.txt

# Result: Clean LLMS.txt file ready for AI/LLM consumption
```

### Inform + Unify Workflow

Use Inform to collect content and Unify to organize and merge it:

```bash
# Step 1: Collect documentation from multiple sources
inform https://github.com/project/repo/tree/main/docs --output-dir ./source1
inform https://docs.project.com --output-dir ./source2 --max-pages 50
inform https://api.project.com/docs --output-dir ./source3 --max-pages 30

# Step 2: Unify the collected documentation
npx @fwdslsh/unify \
  --input ./source1 \
  --input ./source2 \
  --input ./source3 \
  --output ./unified-docs \
  --merge-strategy smart

# Result: Organized, unified documentation structure
```

### Inform + Catalog Workflow

Crawl content with Inform and index it with Catalog:

```bash
# Step 1: Download comprehensive documentation
inform https://docs.framework.com --output-dir ./framework-docs --max-pages 200

# Step 2: Create searchable index with Catalog
npx @fwdslsh/catalog \
  --source ./framework-docs \
  --output ./searchable-index \
  --index-type full-text

# Result: Searchable documentation index
```

## Complete Pipeline Examples

### Documentation Portal Creation

Create a comprehensive documentation portal using all tools:

```bash
#!/bin/bash
# create-docs-portal.sh - Complete documentation pipeline

set -e

PROJECT_NAME="$1"
if [[ -z "$PROJECT_NAME" ]]; then
    echo "Usage: $0 <project-name>"
    exit 1
fi

BASE_DIR="./docs-portal-$PROJECT_NAME"
mkdir -p "$BASE_DIR"

echo "Creating documentation portal for $PROJECT_NAME..."

# Step 1: Collect content from multiple sources using Inform
echo "Step 1: Collecting content..."

# Official documentation
inform "https://docs.$PROJECT_NAME.com" \
    --output-dir "$BASE_DIR/sources/official" \
    --max-pages 100 \
    --delay 500

# GitHub documentation
inform "https://github.com/$PROJECT_NAME/$PROJECT_NAME/tree/main/docs" \
    --output-dir "$BASE_DIR/sources/github" \
    --include "*.md"

# API documentation
inform "https://api.$PROJECT_NAME.com/docs" \
    --output-dir "$BASE_DIR/sources/api" \
    --max-pages 50 \
    --delay 800

# Step 2: Unify all sources into coherent structure
echo "Step 2: Unifying documentation..."
npx @fwdslsh/unify \
    --input "$BASE_DIR/sources/official" \
    --input "$BASE_DIR/sources/github" \
    --input "$BASE_DIR/sources/api" \
    --output "$BASE_DIR/unified" \
    --merge-strategy smart \
    --deduplicate

# Step 3: Create searchable index
echo "Step 3: Creating searchable index..."
npx @fwdslsh/catalog \
    --source "$BASE_DIR/unified" \
    --output "$BASE_DIR/searchable" \
    --index-type full-text \
    --generate-sitemap

# Step 4: Generate LLMS.txt for AI consumption
echo "Step 4: Generating LLMS.txt..."
npx @fwdslsh/lift \
    "$BASE_DIR/unified" \
    --output "$BASE_DIR/llms.txt" \
    --max-tokens 100000 \
    --include-metadata

echo "Documentation portal created successfully!"
echo "  Unified docs: $BASE_DIR/unified/"
echo "  Searchable index: $BASE_DIR/searchable/"
echo "  LLMS.txt: $BASE_DIR/llms.txt"
```

### Multi-Project Documentation Aggregation

Aggregate documentation from multiple projects in your ecosystem:

```bash
#!/bin/bash
# aggregate-ecosystem-docs.sh

PROJECTS=(
    "react:https://react.dev/"
    "vue:https://vuejs.org/guide/"
    "angular:https://angular.io/docs"
    "svelte:https://svelte.dev/docs"
)

BASE_DIR="./ecosystem-docs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Aggregating documentation for frontend ecosystem..."

# Step 1: Download all project documentation
for project_info in "${PROJECTS[@]}"; do
    IFS=':' read -r project_name project_url <<< "$project_info"
    
    echo "Downloading $project_name documentation..."
    inform "$project_url" \
        --output-dir "$BASE_DIR/sources/$project_name" \
        --max-pages 80 \
        --delay 600 \
        --concurrency 2
        
    sleep 30  # Be respectful between projects
done

# Step 2: Create unified structure
echo "Creating unified documentation structure..."
npx @fwdslsh/unify \
    --input "$BASE_DIR/sources/react" \
    --input "$BASE_DIR/sources/vue" \
    --input "$BASE_DIR/sources/angular" \
    --input "$BASE_DIR/sources/svelte" \
    --output "$BASE_DIR/unified" \
    --project-structure \
    --add-frontmatter

# Step 3: Generate comparative index
echo "Generating comparative index..."
npx @fwdslsh/catalog \
    --source "$BASE_DIR/unified" \
    --output "$BASE_DIR/comparison" \
    --index-type comparative \
    --generate-cross-references

# Step 4: Create master LLMS.txt for ecosystem analysis
echo "Creating master LLMS.txt..."
npx @fwdslsh/lift \
    "$BASE_DIR/unified" \
    --output "$BASE_DIR/ecosystem-$TIMESTAMP.llms.txt" \
    --structure-by-project \
    --include-project-metadata

echo "Ecosystem documentation aggregation complete!"
```

## Advanced Integration Patterns

### Continuous Documentation Pipeline

Set up a continuous pipeline that keeps documentation synchronized:

```bash
#!/bin/bash
# continuous-docs-pipeline.sh

CONFIG_FILE="./docs-pipeline.json"

# Create configuration if it doesn't exist
if [[ ! -f "$CONFIG_FILE" ]]; then
    cat > "$CONFIG_FILE" << 'EOF'
{
  "pipeline": {
    "name": "Documentation Pipeline",
    "output_base": "./pipeline-output",
    "schedule": "daily"
  },
  "sources": [
    {
      "name": "main-docs",
      "type": "web",
      "url": "https://docs.example.com",
      "inform_options": {
        "max_pages": 100,
        "delay": 500
      }
    },
    {
      "name": "api-docs", 
      "type": "web",
      "url": "https://api.example.com/docs",
      "inform_options": {
        "max_pages": 50,
        "delay": 800
      }
    },
    {
      "name": "github-docs",
      "type": "github", 
      "url": "https://github.com/company/project/tree/main/docs",
      "inform_options": {
        "include": ["*.md"]
      }
    }
  ],
  "processing": {
    "unify": {
      "enabled": true,
      "merge_strategy": "smart",
      "deduplicate": true
    },
    "catalog": {
      "enabled": true,
      "index_type": "full-text",
      "generate_sitemap": true
    },
    "lift": {
      "enabled": true,
      "max_tokens": 50000,
      "include_metadata": true
    }
  }
}
EOF
    echo "Created default configuration: $CONFIG_FILE"
fi

# Read configuration and execute pipeline
python3 << 'EOF'
import json
import os
import subprocess
import sys

with open('./docs-pipeline.json', 'r') as f:
    config = json.load(f)

pipeline = config['pipeline']
sources = config['sources']
processing = config['processing']

base_dir = pipeline['output_base']
os.makedirs(f"{base_dir}/sources", exist_ok=True)

print(f"Starting pipeline: {pipeline['name']}")

# Step 1: Download all sources
for source in sources:
    print(f"Processing source: {source['name']}")
    
    source_dir = f"{base_dir}/sources/{source['name']}"
    url = source['url']
    options = source.get('inform_options', {})
    
    # Build inform command
    cmd = ['inform', url, '--output-dir', source_dir]
    
    if 'max_pages' in options:
        cmd.extend(['--max-pages', str(options['max_pages'])])
    if 'delay' in options:
        cmd.extend(['--delay', str(options['delay'])])
    if 'include' in options:
        for pattern in options['include']:
            cmd.extend(['--include', pattern])
    
    # Execute inform
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Error downloading {source['name']}: {result.stderr}")
        continue
    
    print(f"Successfully downloaded: {source['name']}")

# Step 2: Unify if enabled
if processing.get('unify', {}).get('enabled', False):
    print("Unifying documentation...")
    unify_config = processing['unify']
    
    cmd = ['npx', '@fwdslsh/unify']
    
    # Add all source directories
    for source in sources:
        cmd.extend(['--input', f"{base_dir}/sources/{source['name']}"])
    
    cmd.extend(['--output', f"{base_dir}/unified"])
    
    if unify_config.get('merge_strategy'):
        cmd.extend(['--merge-strategy', unify_config['merge_strategy']])
    if unify_config.get('deduplicate'):
        cmd.append('--deduplicate')
    
    subprocess.run(cmd)

# Step 3: Catalog if enabled  
if processing.get('catalog', {}).get('enabled', False):
    print("Creating searchable index...")
    catalog_config = processing['catalog']
    
    cmd = ['npx', '@fwdslsh/catalog']
    cmd.extend(['--source', f"{base_dir}/unified"])
    cmd.extend(['--output', f"{base_dir}/searchable"])
    
    if catalog_config.get('index_type'):
        cmd.extend(['--index-type', catalog_config['index_type']])
    if catalog_config.get('generate_sitemap'):
        cmd.append('--generate-sitemap')
    
    subprocess.run(cmd)

# Step 4: Lift if enabled
if processing.get('lift', {}).get('enabled', False):
    print("Generating LLMS.txt...")
    lift_config = processing['lift']
    
    cmd = ['npx', '@fwdslsh/lift']
    cmd.append(f"{base_dir}/unified")
    cmd.extend(['--output', f"{base_dir}/llms.txt"])
    
    if lift_config.get('max_tokens'):
        cmd.extend(['--max-tokens', str(lift_config['max_tokens'])])
    if lift_config.get('include_metadata'):
        cmd.append('--include-metadata')
    
    subprocess.run(cmd)

print("Pipeline execution complete!")
EOF
```

### Content Analysis Workflow

Analyze content patterns across multiple sources:

```bash
#!/bin/bash
# content-analysis-workflow.sh

ANALYSIS_DIR="./content-analysis"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "Starting content analysis workflow..."

# Step 1: Collect content from competitors
competitors=(
    "competitor1:https://docs.competitor1.com"
    "competitor2:https://docs.competitor2.com"
    "competitor3:https://docs.competitor3.com"
)

mkdir -p "$ANALYSIS_DIR/sources"

for competitor_info in "${competitors[@]}"; do
    IFS=':' read -r name url <<< "$competitor_info"
    
    echo "Downloading content from $name..."
    inform "$url" \
        --output-dir "$ANALYSIS_DIR/sources/$name" \
        --max-pages 50 \
        --delay 1000 \
        --concurrency 1  # Be very respectful
        
    sleep 60  # Long delay between competitors
done

# Step 2: Unify for comparison
echo "Unifying content for analysis..."
npx @fwdslsh/unify \
    --input "$ANALYSIS_DIR/sources/competitor1" \
    --input "$ANALYSIS_DIR/sources/competitor2" \
    --input "$ANALYSIS_DIR/sources/competitor3" \
    --output "$ANALYSIS_DIR/unified" \
    --preserve-source-info \
    --add-analysis-metadata

# Step 3: Create analytical index
echo "Creating analytical index..."
npx @fwdslsh/catalog \
    --source "$ANALYSIS_DIR/unified" \
    --output "$ANALYSIS_DIR/analysis" \
    --index-type analytical \
    --generate-statistics \
    --compare-sources

# Step 4: Generate analysis-ready LLMS.txt
echo "Generating analysis-ready LLMS.txt..."
npx @fwdslsh/lift \
    "$ANALYSIS_DIR/unified" \
    --output "$ANALYSIS_DIR/competitive-analysis-$TIMESTAMP.llms.txt" \
    --structure-by-source \
    --include-comparison-metadata \
    --max-tokens 200000

echo "Content analysis workflow complete!"
echo "Analysis results: $ANALYSIS_DIR/analysis/"
echo "LLMS.txt for AI analysis: $ANALYSIS_DIR/competitive-analysis-$TIMESTAMP.llms.txt"
```

## Tool-Specific Integration Tips

### Inform → Unify Best Practices

```bash
# When downloading for Unify processing, use consistent structures
inform https://source1.com --output-dir ./sources/source1 --include "docs/**"
inform https://source2.com --output-dir ./sources/source2 --include "documentation/**"

# Normalize the structure before Unify
mkdir -p ./normalized/source1/docs ./normalized/source2/docs
cp -r ./sources/source1/docs/* ./normalized/source1/docs/
cp -r ./sources/source2/documentation/* ./normalized/source2/docs/

# Then unify the normalized structure
npx @fwdslsh/unify --input ./normalized/source1 --input ./normalized/source2 --output ./unified
```

### Inform → Catalog Optimization

```bash
# For better Catalog indexing, use descriptive output directories
inform https://api.service.com --output-dir ./content/api-documentation
inform https://guides.service.com --output-dir ./content/user-guides  
inform https://examples.service.com --output-dir ./content/code-examples

# Catalog can then create more meaningful indexes
npx @fwdslsh/catalog --source ./content --output ./searchable --structure-aware
```

### Inform → Lift Workflow

```bash
# For optimal LLMS.txt generation, maintain clean directory structure
inform https://docs.example.com \
    --output-dir ./clean-docs \
    --exclude "**/internal/**" \
    --exclude "**/draft-*" \
    --include "*.md"

# Lift works best with clean, well-structured content
npx @fwdslsh/lift ./clean-docs --output ./optimized.llms.txt --clean-content
```

## Ecosystem Automation Scripts

### Daily Sync Across All Tools

```bash
#!/bin/bash
# daily-ecosystem-sync.sh

DATE=$(date +%Y%m%d)
WORKSPACE="./daily-sync-$DATE"

echo "Starting daily ecosystem sync for $DATE"

# 1. Download fresh content
inform https://docs.example.com --output-dir "$WORKSPACE/raw" --max-pages 100

# 2. Process through the complete pipeline
npx @fwdslsh/unify \
    --input "$WORKSPACE/raw" \
    --output "$WORKSPACE/unified" \
    --clean-structure

npx @fwdslsh/catalog \
    --source "$WORKSPACE/unified" \
    --output "$WORKSPACE/searchable" \
    --daily-update

npx @fwdslsh/lift \
    "$WORKSPACE/unified" \
    --output "$WORKSPACE/daily-$DATE.llms.txt"

# 3. Archive and cleanup
tar -czf "daily-sync-$DATE.tar.gz" "$WORKSPACE"
rm -rf "$WORKSPACE"

echo "Daily sync complete: daily-sync-$DATE.tar.gz"
```

### Version Comparison Pipeline

```bash
#!/bin/bash
# version-comparison.sh

OLD_VERSION="$1"
NEW_VERSION="$2"

if [[ -z "$OLD_VERSION" || -z "$NEW_VERSION" ]]; then
    echo "Usage: $0 <old-version> <new-version>"
    exit 1
fi

# Download both versions
inform "https://docs.example.com/v$OLD_VERSION" --output-dir "./versions/v$OLD_VERSION"
inform "https://docs.example.com/v$NEW_VERSION" --output-dir "./versions/v$NEW_VERSION"

# Create unified comparison
npx @fwdslsh/unify \
    --input "./versions/v$OLD_VERSION" \
    --input "./versions/v$NEW_VERSION" \
    --output "./comparison" \
    --comparison-mode \
    --highlight-changes

# Generate diff analysis
npx @fwdslsh/catalog \
    --source "./comparison" \
    --output "./diff-analysis" \
    --comparison-index \
    --generate-change-report

# Create comparison LLMS.txt
npx @fwdslsh/lift \
    "./comparison" \
    --output "./version-comparison-v$OLD_VERSION-to-v$NEW_VERSION.llms.txt" \
    --comparison-structure
```

## Integration Benefits

### Why Use the Ecosystem Together

1. **Data Flow Optimization**: Each tool optimizes for the next in the pipeline
2. **Consistent Formats**: All tools understand the output formats of others
3. **Reduced Processing**: No format conversion overhead between tools
4. **Comprehensive Coverage**: Each tool handles different aspects of documentation workflow
5. **Scalability**: Can handle large documentation sets efficiently

### Performance Considerations

```bash
# For large documentation sets, use staged processing
inform https://huge-docs.com --max-pages 50 --output-dir ./batch1
npx @fwdslsh/unify --input ./batch1 --output ./unified-batch1

inform https://huge-docs.com --max-pages 50 --output-dir ./batch2 --page-offset 50
npx @fwdslsh/unify --input ./batch2 --output ./unified-batch2

# Then combine the unified batches
npx @fwdslsh/unify --input ./unified-batch1 --input ./unified-batch2 --output ./final
```

## Next Steps

- [Examples](./examples.md) - More practical workflow examples
- [Automation & Scripting](./automation-and-scripting.md) - Advanced automation techniques
- [Getting Started](./getting-started.md) - Basic usage guide

## External Resources

- [Unify Documentation](https://github.com/fwdslsh/unify) - Documentation aggregation tool
- [Catalog Documentation](https://github.com/fwdslsh/catalog) - Content indexing system
- [Lift Documentation](https://github.com/fwdslsh/lift) - LLMS.txt generation tool