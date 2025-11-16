# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive test suite with Vitest
- GitHub Actions CI/CD workflows
- ESLint and Prettier for code quality
- CONTRIBUTING.md and CODE_OF_CONDUCT.md
- Code coverage reporting

## [1.1.0] - 2025-01-15

### Added
- Interactive initialization wizard (`npm run init`)
- Automatic Obsidian detection
- Configuration validation during setup
- User-friendly setup experience

### Changed
- Improved error messages with actionable suggestions
- Enhanced documentation structure

## [1.0.0] - 2025-01-10

### Added
- Initial release
- Full note management (CRUD operations)
- Powerful search capabilities:
  - Full-text content search
  - Tag-based search
  - Frontmatter field queries
- Link analysis features:
  - Backlinks discovery
  - Outlinks extraction
  - Orphan notes detection
  - Unlinked references finding
- Vault navigation:
  - Folder structure browsing
  - Daily notes support
  - Vault statistics
- Type-safe implementation with TypeScript
- Comprehensive Zod validation
- Support for both Markdown and JSON output formats
- Wiki-style and Markdown link parsing
- Frontmatter metadata support
- Flexible configuration options

### Documentation
- Comprehensive README with examples
- API reference for all tools
- Installation and configuration guides
- Troubleshooting section
- Use cases and examples

## Version History

### Understanding Version Numbers

This project uses Semantic Versioning (MAJOR.MINOR.PATCH):
- **MAJOR**: Incompatible API changes
- **MINOR**: New functionality (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)

### Release Types

- **Stable**: Production-ready releases (1.0.0, 1.1.0, etc.)
- **Beta**: Feature-complete but may have bugs (1.0.0-beta.1)
- **Alpha**: Early testing versions (1.0.0-alpha.1)

[Unreleased]: https://github.com/davidatoms/obsidian-mcp-server/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/davidatoms/obsidian-mcp-server/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/davidatoms/obsidian-mcp-server/releases/tag/v1.0.0
