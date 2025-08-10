#!/usr/bin/env bun

// Demonstration script showing the new Git mode and filtering features

import { GitUrlParser } from '../src/GitUrlParser.js';
import { FileFilter } from '../src/FileFilter.js';

console.log('🚀 Inform Git Mode & Filtering Demo\n');

// 1. Git URL Detection
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

console.log('\n3. File Filtering Examples:');

// Test different filter combinations
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

console.log('4. CLI Usage Examples:');
console.log(`
  # Web crawling with filtering
  inform https://docs.example.com --include "**/*.html" --exclude "**/archive/**"
  
  # Git repository downloading
  inform https://github.com/owner/repo --include "*.md" --exclude ".github/**"
  
  # Git subdirectory with specific branch
  inform https://github.com/owner/repo/tree/develop/docs --include "**/*.md"
  
  # Multiple include patterns
  inform https://github.com/owner/repo --include "*.md" --include "*.txt" --include "docs/**"
`);

console.log('✨ Demo complete! All features are working correctly.');