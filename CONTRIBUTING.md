# Contributing to Inform

Thank you for your interest in contributing to Inform! We welcome contributions from the community and are grateful for any help you can provide.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Testing Requirements](#testing-requirements)
- [Submitting Pull Requests](#submitting-pull-requests)
- [Reporting Issues](#reporting-issues)
- [Questions](#questions)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please be considerate and constructive in your interactions with other contributors.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) v1.0.0 or higher
- Git
- A GitHub account

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/inform.git
   cd inform
   ```

3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/fwdslsh/inform.git
   ```

4. **Install dependencies**:
   ```bash
   bun install
   ```

5. **Verify setup by running tests**:
   ```bash
   bun test
   ```

   All 52 tests should pass.

## Development Workflow

### Creating a Feature Branch

```bash
# Update your local main branch
git checkout main
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the feature branch
2. Write or update tests as needed
3. Ensure all tests pass: `bun test`
4. Ensure code follows our style guidelines

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test tests/web-crawler.test.js

# Watch mode for development
bun test --watch
```

### Building Binaries (Optional)

```bash
# Build for your current platform
bun run build

# Build for all platforms
bun run build:all
```

## Code Style Guidelines

### JavaScript/ES Modules

- Use ES6+ features and modern JavaScript syntax
- Use `const` and `let` instead of `var`
- Prefer arrow functions for callbacks
- Use template literals for string interpolation
- Use destructuring when appropriate

### Code Organization

- **File structure**: Keep related code together
- **Class methods**: Group related methods together
- **Async/await**: Prefer `async/await` over `.then()` chains
- **Error handling**: Always handle errors appropriately

### Naming Conventions

- **Classes**: PascalCase (e.g., `WebCrawler`, `RobotsParser`)
- **Functions/Methods**: camelCase (e.g., `crawlPage`, `fetchWithRetry`)
- **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `MAX_RETRIES`)
- **Files**: PascalCase for classes (e.g., `WebCrawler.js`), camelCase for utilities

### Comments and Documentation

- Write clear, concise comments for complex logic
- Use JSDoc comments for public methods and classes
- Explain **why**, not **what** (code should be self-documenting for the "what")
- Update documentation when changing functionality

### Example

```javascript
/**
 * Fetch with retry logic and exponential backoff
 * @param {string} url - URL to fetch
 * @param {object} fetchOptions - Options to pass to fetch
 * @returns {Promise<Response>} - Fetch response
 */
async fetchWithRetry(url, fetchOptions = {}) {
  const retryableStatus = new Set([429, 500, 502, 503, 504]);

  for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok || !retryableStatus.has(response.status)) {
        return response;
      }

      // Retry logic...
    } catch (error) {
      // Error handling...
    }
  }
}
```

## Testing Requirements

### Writing Tests

- **All new features must include tests**
- **Bug fixes should include regression tests**
- Place tests in the `tests/` directory
- Use descriptive test names that explain what is being tested

### Test Structure

```javascript
import { describe, it, expect } from 'bun:test';
import { YourClass } from '../src/YourClass.js';

describe('YourClass', () => {
  it('should do something specific', () => {
    const instance = new YourClass();
    const result = instance.method();
    expect(result).toBe(expectedValue);
  });
});
```

### Test Coverage

- Aim for high test coverage on new code
- Test both success and error cases
- Test edge cases and boundary conditions
- Run `bun test` before submitting PR

## Submitting Pull Requests

### Before Submitting

- [ ] All tests pass (`bun test`)
- [ ] Code follows style guidelines
- [ ] New features include tests
- [ ] Documentation is updated (README.md, CHANGELOG.md, etc.)
- [ ] Commit messages are clear and descriptive

### PR Process

1. **Push your changes** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub:
   - Go to the [Inform repository](https://github.com/fwdslsh/inform)
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill out the PR template with a clear description

3. **PR Description should include**:
   - What changes were made
   - Why the changes were necessary
   - Any breaking changes
   - Related issue numbers (if applicable)

4. **Respond to feedback**:
   - Address review comments promptly
   - Make requested changes in new commits
   - Push updates to the same branch

### Commit Message Format

Follow conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, semicolons, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(crawler): add robots.txt support
fix(retry): handle network errors correctly
docs(readme): update installation instructions
test(parser): add tests for edge cases
```

## Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Description**: Clear description of the issue
2. **Steps to Reproduce**: Minimal steps to reproduce the bug
3. **Expected Behavior**: What you expected to happen
4. **Actual Behavior**: What actually happened
5. **Environment**:
   - Bun version (`bun --version`)
   - OS and version
   - Inform version
6. **Logs/Screenshots**: Any relevant error messages or screenshots

### Feature Requests

When requesting features, please include:

1. **Problem Statement**: What problem does this solve?
2. **Proposed Solution**: How should it work?
3. **Alternatives**: Any alternative solutions considered
4. **Use Cases**: Real-world examples of when this would be useful

### Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

Instead, please report them privately to the maintainers. Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if known)

## Questions?

- **Documentation**: Check the [docs/](./docs/) directory
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions and ideas

## Recognition

Contributors will be recognized in:
- Git commit history
- Release notes (for significant contributions)
- Future CONTRIBUTORS.md file (coming soon)

Thank you for contributing to Inform! 🚀
