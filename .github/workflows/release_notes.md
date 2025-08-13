## Usage

```bash
# Build a static site
unify build --source src --output dist

# Start development server with live reload
unify serve --source dist --port 3000

# Watch mode for development
unify watch --source src --output dist

# Build with pretty URLs
unify build --source src --output dist --pretty-urls

# Build with minification
unify build --source src --output dist --minify
```

## Features

- **Server-Side Includes (SSI)**: Apache-style `<!--#include -->` directives
- **DOM Templating**: Modern `<template>` and `<slot>` system
- **Markdown Processing**: Full markdown support with YAML frontmatter
- **Live Development**: Hot reload with incremental builds
- **Asset Optimization**: Smart asset copying and reference tracking
- **SEO Ready**: Automatic sitemap generation

## Documentation

For full documentation, visit the [project repository](https://github.com/fwdslsh/unify).
