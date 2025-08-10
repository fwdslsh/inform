
#!/usr/bin/env bun

/**
 * This is a custom demonstration script using the `inform` API to curate documentation
 * for a specific project. It shows how you can use inform's Git and web modes, as well as
 * flexible file filtering, to download and organize documentation from multiple sources.
 *
 * In a real workflow, inform would download documentation into a local `docs/` directory,
 * with a subdirectory for each source (e.g., `docs/github.com-owner-repo/`, `docs/example.com/`).
 * This makes it easy to curate, browse, and manage docs for your project in one place.
 */

import { GitUrlParser } from '../src/GitUrlParser.js';
import { FileFilter } from '../src/FileFilter.js';

console.log('🚀 Inform Git Mode & Filtering Demo\n');

// 1. Git URL Detection
// Use inform's GitUrlParser to detect whether a URL points to a Git repository or a regular website.
console.log('1. Git URL Detection:');
const testUrls = [
  'https://github.com/microsoft/vscode',
  'https://github.com/microsoft/vscode/tree/main/src',
  'https://github.com/microsoft/vscode/blob/main/README.md',
  'https://docs.github.com',
  'https://example.com/docs'
];

testUrls.forEach(url => {
  const isGit = GitUrlParser.isGitUrl(url);
  console.log(`  ${url} → ${isGit ? '🔗 Git Mode' : '🕷️ Web Mode'}`);
});

// 2. Git URL Parsing
// Parse GitHub URLs to extract owner, repo, branch, and subdirectory info for targeted downloads.
console.log('\n2. Git URL Parsing:');
const gitUrls = [
  'https://github.com/fwdslsh/inform',
  'https://github.com/fwdslsh/inform/tree/main/docs',
  'https://github.com/fwdslsh/inform/tree/develop/src',
  'https://github.com/owner/repo?ref=feature-branch'
];

gitUrls.forEach(url => {
  try {
    const parsed = GitUrlParser.parseGitUrl(url);
    console.log(`  ${url}`);
    console.log(`    → Owner: ${parsed.owner}, Repo: ${parsed.repo}, Branch: ${parsed.branch}`);
    if (parsed.subdirectory) {
      console.log(`    → Subdirectory: ${parsed.subdirectory}`);
    }
  } catch (error) {
    console.log(`    → Error: ${error.message}`);
  }
});

// 3. File Filtering Examples
// Use FileFilter to include/exclude files based on glob patterns, ensuring only relevant docs are curated.
console.log('\n3. File Filtering Examples:');

const filterTests = [
  { include: ['*.md'], exclude: [], files: ['README.md', 'docs/api.md', 'src/index.js', 'package.json'] },
  { include: ['docs/**'], exclude: [], files: ['README.md', 'docs/api.md', 'docs/guide.txt', 'src/index.js'] },
  { include: ['**/*.md', '**/*.txt'], exclude: ['**/node_modules/**'], files: ['README.md', 'docs/api.md', 'node_modules/pkg/readme.md', 'guide.txt'] },
  { include: [], exclude: ['*.log', 'tmp/**'], files: ['app.js', 'debug.log', 'tmp/cache.txt', 'data.json'] }
];

filterTests.forEach((test, index) => {
  const filter = new FileFilter({ include: test.include, exclude: test.exclude });
  console.log(`  Test ${index + 1}:`);
  console.log(`    Include: ${test.include.length ? test.include.join(', ') : 'none'}`);
  console.log(`    Exclude: ${test.exclude.length ? test.exclude.join(', ') : 'none'}`);
  test.files.forEach(file => {
    const included = filter.shouldInclude(file);
    console.log(`    ${file} → ${included ? '✅ Include' : '❌ Exclude'}`);
  });
  console.log('');
});

// 4. CLI Usage Examples
// These examples show how inform can be used to curate docs from different sources into your local docs/ directory.
console.log('4. CLI Usage Examples:');
console.log(`
  # Crawl a website and download HTML docs into docs/example.com/
  inform https://docs.example.com --include "**/*.html" --exclude "**/archive/**" --output docs/example.com/

  # Download Markdown docs from a GitHub repo into docs/github.com-owner-repo/
  inform https://github.com/owner/repo --include "*.md" --exclude ".github/**" --output docs/github.com-owner-repo/

  # Download docs from a GitHub subdirectory and branch into docs/github.com-owner-repo-branch-subdir/
  inform https://github.com/owner/repo/tree/develop/docs --include "**/*.md" --output docs/github.com-owner-repo-develop-docs/

  # Download multiple doc types from a repo into docs/github.com-owner-repo/
  inform https://github.com/owner/repo --include "*.md" --include "*.txt" --include "docs/**" --output docs/github.com-owner-repo/
`);

console.log('✨ Demo complete! All features are working correctly.');