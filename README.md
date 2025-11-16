# Obsidian MCP Server

[![CI](https://github.com/davidatoms/obsidian-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/davidatoms/obsidian-mcp-server/actions/workflows/ci.yml)
[![npm version](https://badge.fury.io/js/obsidian-mcp-server.svg)](https://badge.fury.io/js/obsidian-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![MCP](https://img.shields.io/badge/MCP-1.0-purple)](https://modelcontextprotocol.io)

A production-ready Model Context Protocol (MCP) server that enables Claude and other AI assistants to interact with Obsidian markdown vaults as a native knowledge management interface.

**⭐ If you find this useful, please star this repo!**

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [Initialization Wizard](INITIALIZATION.md) - Interactive setup with Obsidian detection
- [Claude Desktop Integration](#claude-desktop-integration)
- [Available Tools](#available-tools)
- [Development](#development)
- [Use Cases](#use-cases)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Full Note Management**: Create, read, update, and delete notes with frontmatter support
- **Powerful Search**: Full-text search, tag queries, and frontmatter field searches
- **Link Analysis**: Discover backlinks, outlinks, orphan notes, and unlinked references
- **Vault Navigation**: Browse folders, access daily notes, and get vault statistics
- **Flexible Output**: Supports both Markdown and JSON response formats
- **Type-Safe**: Built with TypeScript with comprehensive Zod validation
- **Production Ready**: Follows MCP best practices and includes proper error handling

## Quick Start

### Option 1: NPM (Recommended)

```bash
npm install -g obsidian-mcp-server
```

### Option 2: From Source with Interactive Setup

**NEW**: Includes an initialization wizard that checks for Obsidian and configures your vault:

```bash
git clone https://github.com/davidatoms/obsidian-mcp-server.git
cd obsidian-mcp-server
npm install
npm run build
npm run init  # Interactive setup wizard
```

The wizard will verify Obsidian is installed and help you configure your vault path.

### Option 3: Using npx (No Installation)

```bash
npx obsidian-mcp-server --vault-path /path/to/your/vault
```

## Configuration

The server needs to know the path to your Obsidian vault. You can configure this in three ways:

### 1. Environment Variable (Recommended)

```bash
export OBSIDIAN_VAULT_PATH="/path/to/your/vault"
```

### 2. Command Line Argument

```bash
obsidian-mcp-server --vault-path /path/to/your/vault
```

### 3. Config File

Create `~/.obsidian-mcp/config.json`:

```json
{
  "vaults": {
    "default": "/Users/david/Documents/ObsidianVault",
    "work": "/Users/david/Documents/WorkNotes"
  },
  "defaultVault": "default"
}
```

## Claude Desktop Integration

Add this to your Claude Desktop config file (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "obsidian": {
      "command": "node",
      "args": [
        "/path/to/obsidian-mcp-server/dist/index.js"
      ],
      "env": {
        "OBSIDIAN_VAULT_PATH": "/path/to/your/vault"
      }
    }
  }
}
```

**Config file locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

After updating the config, restart Claude Desktop.

## Available Tools

### Note Management

#### `obsidian_get_note`
Read a note from the vault by path or title.

```json
{
  "path": "folder/note.md",
  "format": "markdown"
}
```

Or search by title:

```json
{
  "title": "My Research Note",
  "format": "markdown"
}
```

#### `obsidian_create_note`
Create a new note with optional frontmatter.

```json
{
  "path": "Research/New Topic.md",
  "content": "# New Topic\n\nContent here...",
  "frontmatter": {
    "tags": ["research", "physics"],
    "status": "draft"
  },
  "format": "markdown"
}
```

#### `obsidian_update_note`
Update an existing note's content or frontmatter.

```json
{
  "path": "Research/Topic.md",
  "content": "Additional content...",
  "append": true,
  "frontmatter": {
    "status": "reviewed"
  },
  "format": "markdown"
}
```

#### `obsidian_delete_note`
Delete a note (requires confirmation).

```json
{
  "path": "Archive/old-note.md",
  "confirm": true
}
```

#### `obsidian_list_notes`
List notes with optional filters and pagination.

```json
{
  "folder": "Research",
  "tag": "physics",
  "limit": 20,
  "offset": 0,
  "format": "markdown"
}
```

### Search & Discovery

#### `obsidian_search_content`
Full-text search across all notes.

```json
{
  "query": "quantum mechanics",
  "folder": "Research",
  "caseSensitive": false,
  "limit": 50,
  "format": "markdown"
}
```

#### `obsidian_search_tags`
Find notes by tag (supports nested tags).

```json
{
  "tag": "research/physics",
  "format": "markdown"
}
```

#### `obsidian_list_tags`
List all tags with usage counts.

```json
{
  "sortBy": "count",
  "format": "markdown"
}
```

#### `obsidian_search_frontmatter`
Query notes by frontmatter fields.

```json
{
  "field": "status",
  "value": "draft",
  "format": "markdown"
}
```

### Link Analysis

#### `obsidian_get_backlinks`
Find all notes linking to a target note.

```json
{
  "path": "Concepts/Important Idea.md",
  "format": "markdown"
}
```

#### `obsidian_get_outlinks`
Get all outgoing links from a note.

```json
{
  "path": "Research/My Paper.md",
  "format": "markdown"
}
```

#### `obsidian_get_orphans`
Find notes with no backlinks.

```json
{
  "format": "markdown"
}
```

#### `obsidian_get_unlinked_references`
Find potential links (mentions without links).

```json
{
  "path": "Concepts/Important Idea.md",
  "limit": 50,
  "format": "markdown"
}
```

### Vault Navigation

#### `obsidian_list_folders`
Browse vault folder structure.

```json
{
  "path": "Research",
  "recursive": true,
  "format": "markdown"
}
```

#### `obsidian_get_daily_note`
Get or create a daily note.

```json
{
  "date": "2024-01-15",
  "create": true,
  "format": "markdown"
}
```

#### `obsidian_get_vault_stats`
Get vault statistics.

```json
{
  "format": "markdown"
}
```

## Link Formats Supported

The server understands multiple Obsidian link formats:

- **Wiki links**: `[[Note Name]]`
- **Wiki links with aliases**: `[[Note Name|Display Text]]`
- **Links to headings**: `[[Note Name#Heading]]`
- **Path-based links**: `[[folder/note]]`
- **Markdown links**: `[text](path/to/note.md)`
- **Embeds**: `![[Note Name]]` or `![](image.png)`

## Frontmatter Support

The server supports YAML frontmatter with any custom fields:

```yaml
---
title: My Note Title
tags: [research, physics, quantum]
aliases: [Alternative Name, Shorthand]
created: 2024-01-15
modified: 2024-01-20
status: draft
custom_field: any value
---
```

Common fields:
- `title`: Note title (string)
- `tags`: Tags array (string[])
- `aliases`: Alternative names (string[])
- `created`: Creation date (ISO 8601 string)
- `modified`: Last modified date (ISO 8601 string)
- `status`: Custom status field (string)

## Response Formats

### Markdown Format (Default)
Human-readable format with proper formatting:

```markdown
# Note Title

**Path**: path/to/note.md
**Tags**: #tag1, #tag2
**Links**: [[Link1]], [[Link2]]
**Created**: 2024-01-15T10:30:00Z
**Modified**: 2024-01-20T15:45:00Z

## Frontmatter
```yaml
{
  "title": "Note Title",
  "tags": ["tag1", "tag2"]
}
```

## Content

[Note content here...]
```

### JSON Format
Structured data format for programmatic use:

```json
{
  "path": "path/to/note.md",
  "name": "Note Title",
  "content": "...",
  "frontmatter": {...},
  "tags": ["tag1", "tag2"],
  "links": ["Link1", "Link2"],
  "created": "2024-01-15T10:30:00Z",
  "modified": "2024-01-20T15:45:00Z"
}
```

## Error Handling

The server provides actionable error messages:

- **Note not found**: `"Note not found: 'title'. Did you mean: [suggestions]?"`
- **Invalid path**: `"Invalid path: paths must be relative to vault root"`
- **Tag not found**: `"Tag '#tag/subtag' not found. Available tags: [list]"`
- **Vault not configured**: `"Vault path not configured. Set OBSIDIAN_VAULT_PATH environment variable"`

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode for development
npm run watch

# Run locally
node dist/index.js --vault-path /path/to/vault
```

## Architecture

```
obsidian-mcp-server/
├── src/
│   ├── index.ts              # Server initialization & tool registration
│   ├── types.ts              # TypeScript interfaces
│   ├── constants.ts          # Shared constants & regexes
│   ├── services/
│   │   └── vault.ts          # Core vault operations
│   ├── tools/
│   │   ├── notes.ts          # Note CRUD operations
│   │   ├── search.ts         # Search functionality
│   │   ├── links.ts          # Link analysis
│   │   └── navigation.ts     # Vault navigation
│   └── schemas/
│       └── validation.ts     # Zod validation schemas
└── dist/                     # Compiled JavaScript
```

## Use Cases

### Research Orchestration
- Search across research notes by topic or tag
- Find connections between concepts via backlinks
- Track research status via frontmatter queries
- Organize notes by folder and tag hierarchy

### Knowledge Base Management
- Discover orphan notes that need integration
- Find unlinked references to strengthen connections
- Get vault statistics to understand knowledge graph health
- Navigate folder structure programmatically

### Daily Workflow
- Create and access daily notes
- Search for content across all notes
- Update note metadata and status
- Generate insights from linked notes

### Content Creation
- Create new notes with templates
- Update multiple notes systematically
- Add backlinks and references
- Organize content with tags and folders

## Performance Considerations

- **Caching**: File listings and parsed notes are cached for large vaults (10k+ notes)
- **Pagination**: All list operations support pagination to handle large result sets
- **Efficient Search**: Title and tag searches use optimized algorithms
- **Lazy Loading**: Notes are only parsed when accessed

## Troubleshooting

### Server won't start

**Issue**: `Vault path not configured`

**Solution**: Set `OBSIDIAN_VAULT_PATH` environment variable or use `--vault-path` argument

---

**Issue**: `Vault path not found or not accessible`

**Solution**: Verify the path exists and the user has read/write permissions

### Note not found

**Issue**: `Note not found: 'title'`

**Solution**:
- Check spelling and capitalization
- Use the path instead of title for exact matching
- Review suggestions provided in the error message

### Search returns no results

**Issue**: Search doesn't find expected notes

**Solution**:
- Check if `caseSensitive` is set correctly
- Try searching without folder or tag filters
- Verify the search term exists in note content

### Links not resolving

**Issue**: Backlinks or outlinks missing

**Solution**:
- Ensure links use proper Obsidian format: `[[Note Name]]`
- Check for typos in link targets
- Verify linked notes exist in the vault

## Contributing

Contributions are welcome! This project is open source and we'd love your help making it better.

### How to Contribute

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add some amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

Please make sure to:
- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits focused and descriptive

### Reporting Issues

Found a bug or have a feature request? Please [open an issue](https://github.com/davidatoms/obsidian-mcp-server/issues) with:
- A clear description of the problem/feature
- Steps to reproduce (for bugs)
- Your environment details (OS, Node version, etc.)

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

Built following the [Model Context Protocol](https://modelcontextprotocol.io) specification by Anthropic.

Designed for use with [Obsidian](https://obsidian.md), the powerful knowledge base that works on local Markdown files.

---

**Questions or Issues?** Open an issue on GitHub or consult the [MCP documentation](https://modelcontextprotocol.io/docs).
