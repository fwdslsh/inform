# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **BREAKING**: Increased default delay from 300ms to 1000ms to align with documentation and promote responsible crawling practices
  - This change reduces load on target servers and aligns with ethical web scraping guidelines
  - Users who need faster crawling can still use `--delay 300` or lower values
  - The new default matches what was documented in README.md

### Added

- Comprehensive Development section in README.md with setup instructions
- Development workflow documentation including testing and building
- Project structure overview in documentation
- Fixed Dependencies section in README.md (removed outdated jsdom reference)

### Fixed

- Documentation now correctly lists only current dependencies (turndown, minimatch)
- Resolved inconsistency between code default (300ms) and documented default (1000ms)

## [0.1.0] - 2025-08-13

### Changed

- **BREAKING**: Replaced jsdom with Bun's native HTMLRewriter for HTML parsing
- **BREAKING**: Removed dependency on jsdom - now fully zero-dependency for HTML processing
- Improved performance with streaming HTML parsing using HTMLRewriter
- Reduced bundle size by eliminating heavy DOM libraries
- Enhanced compilation reliability - no more missing worker file errors

### Added

- Native Bun HTMLRewriter support for efficient HTML processing
- Streaming HTML parsing for better memory efficiency
- Comprehensive test suite for HTMLRewriter implementation

### Removed

- jsdom dependency and all related DOM manipulation methods
- extractMainContent, preserveCodeBlocks, removeUnwantedElements, findLinks methods (replaced with HTMLRewriter approach)

### Fixed

- Compilation errors related to missing jsdom worker files
- Memory efficiency improvements with streaming parsing

### Technical Details

- Uses Bun's built-in `HTMLRewriter` API for HTML processing
- Maintains same CLI interface and functionality
- All existing features preserved with better performance
- Cross-platform binary builds now work without external dependencies

## [0.0.15] - Previous Release

- Last version using jsdom
- Various bug fixes and improvements
