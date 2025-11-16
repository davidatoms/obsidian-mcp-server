# Contributing to Obsidian MCP Server

Thank you for your interest in contributing to Obsidian MCP Server! This document provides guidelines and instructions for contributing.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates. When creating a bug report, include:

- **Clear descriptive title**
- **Exact steps to reproduce** the problem
- **Expected behavior** and what actually happened
- **Environment details**: OS, Node version, Obsidian version
- **Screenshots or error messages** if applicable

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear description** of the feature
- **Use case** - why would this be useful?
- **Possible implementation** approach (optional)
- **Examples** of similar features elsewhere (optional)

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `master`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** following our coding standards
4. **Add tests** for new functionality
5. **Run the test suite**:
   ```bash
   npm test
   npm run lint
   npm run typecheck
   ```
6. **Commit your changes** with clear messages:
   ```bash
   git commit -m "Add feature: brief description"
   ```
7. **Push to your fork** and submit a pull request

## Development Setup

### Prerequisites

- Node.js ≥18.0.0
- npm or yarn
- Git
- Obsidian vault for testing (optional but recommended)

### Setup Steps

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/obsidian-mcp-server.git
cd obsidian-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode (watch for changes)
npm run watch
```

### Testing

We use Vitest for testing. Tests should be colocated with source files:

```
src/
  services/
    vault.ts
    vault.test.ts  ← Test file next to implementation
```

#### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui
```

#### Writing Tests

- Write tests for all new functionality
- Maintain or improve code coverage (currently 80%+)
- Use descriptive test names
- Test edge cases and error conditions

Example:
```typescript
describe('VaultService', () => {
  it('should extract tags from content', () => {
    const content = 'This has #tag1 and #tag2';
    const tags = vault.extractTags(content);
    expect(tags).toContain('tag1');
    expect(tags).toContain('tag2');
  });
});
```

## Coding Standards

### TypeScript

- Use **strict type checking** (already configured)
- Avoid `any` types - use proper types or `unknown`
- Export types that might be useful to consumers
- Document complex types with comments

### Code Style

We use ESLint and Prettier for consistent code style:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Format code
npm run format
```

Key style guidelines:
- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line objects/arrays
- Maximum line length: 100 characters
- Use async/await over raw promises
- Prefer const over let, never use var

### Commit Messages

Follow conventional commit format:

```
type(scope): brief description

Longer description if needed

Closes #issue-number
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Adding or updating tests
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `chore`: Maintenance tasks

Examples:
```
feat(search): add full-text search with fuzzy matching
fix(vault): handle spaces in file paths correctly
docs(readme): update installation instructions
test(links): add tests for backlink detection
```

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Update CHANGELOG.md with notable changes
- Include examples for new features

Example JSDoc:
```typescript
/**
 * Extract all links from markdown content
 * 
 * Supports wiki-style [[links]] and markdown [links](path)
 * 
 * @param content - The markdown content to parse
 * @returns Array of parsed links with metadata
 */
extractLinks(content: string): ParsedLink[] {
  // implementation
}
```

## Project Structure

```
obsidian-mcp-server/
├── src/
│   ├── index.ts              # Server entry point
│   ├── types.ts              # TypeScript type definitions
│   ├── constants.ts          # Shared constants
│   ├── services/             # Core services
│   │   └── vault.ts          # Vault operations
│   ├── tools/                # MCP tool implementations
│   │   ├── notes.ts          # Note CRUD operations
│   │   ├── search.ts         # Search functionality
│   │   ├── links.ts          # Link analysis
│   │   └── navigation.ts     # Vault navigation
│   └── schemas/              # Validation schemas
│       └── validation.ts     # Zod schemas
├── tests/                    # Integration tests (if any)
├── .github/                  # GitHub workflows
└── dist/                     # Compiled output
```

## Release Process

Maintainers follow this process for releases:

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create a release commit
4. Tag the release: `git tag v1.x.x`
5. Push tags: `git push --tags`
6. GitHub Actions will automatically publish to npm

## Questions?

- Open an issue for questions about contributing
- Check existing issues and pull requests
- Review the [README](README.md) for project overview

## Recognition

Contributors will be recognized in the project! Significant contributions may be highlighted in release notes.

Thank you for contributing to Obsidian MCP Server! ⚡
