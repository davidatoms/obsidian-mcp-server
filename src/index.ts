#!/usr/bin/env node

/**
 * Obsidian MCP Server
 * Main entry point with tool registration and server initialization
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { VaultService } from './services/vault.js';
import { NoteTools } from './tools/notes.js';
import { SearchTools } from './tools/search.js';
import { LinkTools } from './tools/links.js';
import { NavigationTools } from './tools/navigation.js';
import {
  GetNoteSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  DeleteNoteSchema,
  ListNotesSchema,
  SearchContentSchema,
  SearchTagsSchema,
  ListTagsSchema,
  SearchFrontmatterSchema,
  GetBacklinksSchema,
  GetOutlinksSchema,
  GetOrphansSchema,
  GetUnlinkedReferencesSchema,
  ListFoldersSchema,
  GetDailyNoteSchema,
  GetVaultStatsSchema,
  GetGraphViewSchema,
} from './schemas/validation.js';
import { ERROR_MESSAGES } from './constants.js';

/**
 * Get vault path from environment, args, or config file
 */
function getVaultPath(): string {
  // Check environment variable
  if (process.env.OBSIDIAN_VAULT_PATH) {
    return process.env.OBSIDIAN_VAULT_PATH;
  }

  // Check command line arguments
  const vaultArgIndex = process.argv.indexOf('--vault-path');
  if (vaultArgIndex !== -1 && process.argv[vaultArgIndex + 1]) {
    return process.argv[vaultArgIndex + 1];
  }

  // Check config file
  const configPath = path.join(os.homedir(), '.obsidian-mcp', 'config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.vaults && config.defaultVault) {
        const vaultPath = config.vaults[config.defaultVault];
        if (vaultPath) return vaultPath;
      }
    } catch (error) {
      // Ignore config file errors
    }
  }

  throw new Error(ERROR_MESSAGES.VAULT_NOT_CONFIGURED);
}


/**
 * Main server initialization
 */
async function main() {
  try {
    // Get and validate vault path
    const vaultPath = getVaultPath();
    const vault = new VaultService(vaultPath);
    await vault.validateVault();

    // Initialize tool handlers
    const noteTools = new NoteTools(vault);
    const searchTools = new SearchTools(vault);
    const linkTools = new LinkTools(vault);
    const navigationTools = new NavigationTools(vault);

    // Create MCP server
    const server = new Server(
      {
        name: 'obsidian-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Define all tools with proper schemas
    const tools: Tool[] = [
      {
        name: 'obsidian_get_note',
        description: 'Read a note from the vault by path or title. Supports fuzzy title matching and will suggest similar notes if not found. Returns note content, frontmatter, tags, and links.',
        inputSchema: zodToJsonSchema(GetNoteSchema) as any,
      },
      {
        name: 'obsidian_create_note',
        description: 'Create a new note in the vault. Automatically creates parent folders if needed. Supports frontmatter for metadata like tags, aliases, and custom fields. The path should include the .md extension or it will be added automatically.',
        inputSchema: zodToJsonSchema(CreateNoteSchema) as any,
      },
      {
        name: 'obsidian_update_note',
        description: 'Update an existing note\'s content and/or frontmatter. Can append to existing content or replace it entirely. Frontmatter fields are merged with existing values.',
        inputSchema: zodToJsonSchema(UpdateNoteSchema) as any,
      },
      {
        name: 'obsidian_delete_note',
        description: 'Delete a note from the vault. Requires explicit confirmation with confirm: true for safety. This operation cannot be undone.',
        inputSchema: zodToJsonSchema(DeleteNoteSchema) as any,
      },
      {
        name: 'obsidian_list_notes',
        description: 'List notes in the vault with optional filters. Can filter by folder or tag. Supports pagination with limit and offset. Results are sorted by modification date (newest first).',
        inputSchema: zodToJsonSchema(ListNotesSchema) as any,
      },
      {
        name: 'obsidian_search_content',
        description: 'Full-text search across all notes. Searches in note titles, headings, and content. Returns relevance-scored results with snippets showing match context. Can be filtered by folder or tag.',
        inputSchema: zodToJsonSchema(SearchContentSchema) as any,
      },
      {
        name: 'obsidian_search_tags',
        description: 'Find all notes with a specific tag. Supports nested tags with prefix matching (e.g., searching for "research" will match "research/physics" and "research/economics").',
        inputSchema: zodToJsonSchema(SearchTagsSchema) as any,
      },
      {
        name: 'obsidian_list_tags',
        description: 'List all tags used in the vault with usage counts. Can be sorted by tag name or usage count. Useful for exploring the vault\'s taxonomy.',
        inputSchema: zodToJsonSchema(ListTagsSchema) as any,
      },
      {
        name: 'obsidian_search_frontmatter',
        description: 'Query notes by frontmatter fields. Can search for notes with a specific field present or with a specific field value. Useful for finding notes by status, date, or custom metadata.',
        inputSchema: zodToJsonSchema(SearchFrontmatterSchema) as any,
      },
      {
        name: 'obsidian_get_backlinks',
        description: 'Find all notes that link to a target note. Essential for understanding note relationships and discovering related content. Shows the knowledge graph from an inbound perspective.',
        inputSchema: zodToJsonSchema(GetBacklinksSchema) as any,
      },
      {
        name: 'obsidian_get_outlinks',
        description: 'Get all outgoing links from a note. Shows what resources and concepts the note references. Useful for understanding note dependencies and connections.',
        inputSchema: zodToJsonSchema(GetOutlinksSchema) as any,
      },
      {
        name: 'obsidian_get_orphans',
        description: 'Find orphan notes (notes with no backlinks). These notes may be isolated or need better integration into the knowledge graph. Useful for vault maintenance and ensuring all notes are discoverable.',
        inputSchema: zodToJsonSchema(GetOrphansSchema) as any,
      },
      {
        name: 'obsidian_get_unlinked_references',
        description: 'Find potential links - places where a note is mentioned but not linked. Helps discover implicit connections and suggests where links could be added to strengthen the knowledge graph.',
        inputSchema: zodToJsonSchema(GetUnlinkedReferencesSchema) as any,
      },
      {
        name: 'obsidian_list_folders',
        description: 'Browse the vault\'s folder structure. Can list folders at a specific path or recursively show all folders. Includes note counts for each folder.',
        inputSchema: zodToJsonSchema(ListFoldersSchema) as any,
      },
      {
        name: 'obsidian_get_daily_note',
        description: 'Get or create a daily note for a specific date. Daily notes are stored in the "Daily Notes" folder with YYYY-MM-DD format. Automatically creates the note with a standard template if it doesn\'t exist.',
        inputSchema: zodToJsonSchema(GetDailyNoteSchema) as any,
      },
      {
        name: 'obsidian_get_vault_stats',
        description: 'Get comprehensive statistics about the vault including total notes, tags, links, folders, average note length, and orphan count. Useful for understanding vault size and health.',
        inputSchema: zodToJsonSchema(GetVaultStatsSchema) as any,
      },
    ];

    // Register list tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));

    // Register tool call handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'obsidian_get_note': {
            const input = GetNoteSchema.parse(args);
            const result = await noteTools.getNote(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_create_note': {
            const input = CreateNoteSchema.parse(args);
            const result = await noteTools.createNote(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_update_note': {
            const input = UpdateNoteSchema.parse(args);
            const result = await noteTools.updateNote(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_delete_note': {
            const input = DeleteNoteSchema.parse(args);
            const result = await noteTools.deleteNote(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_list_notes': {
            const input = ListNotesSchema.parse(args);
            const result = await noteTools.listNotes(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_search_content': {
            const input = SearchContentSchema.parse(args);
            const result = await searchTools.searchContent(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_search_tags': {
            const input = SearchTagsSchema.parse(args);
            const result = await searchTools.searchTags(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_list_tags': {
            const input = ListTagsSchema.parse(args);
            const result = await searchTools.listTags(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_search_frontmatter': {
            const input = SearchFrontmatterSchema.parse(args);
            const result = await searchTools.searchFrontmatter(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_get_backlinks': {
            const input = GetBacklinksSchema.parse(args);
            const result = await linkTools.getBacklinks(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_get_outlinks': {
            const input = GetOutlinksSchema.parse(args);
            const result = await linkTools.getOutlinks(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_get_orphans': {
            const input = GetOrphansSchema.parse(args);
            const result = await linkTools.getOrphans(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_get_unlinked_references': {
            const input = GetUnlinkedReferencesSchema.parse(args);
            const result = await linkTools.getUnlinkedReferences(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_list_folders': {
            const input = ListFoldersSchema.parse(args);
            const result = await navigationTools.listFolders(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_get_daily_note': {
            const input = GetDailyNoteSchema.parse(args);
            const result = await navigationTools.getDailyNote(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_get_vault_stats': {
            const input = GetVaultStatsSchema.parse(args);
            const result = await navigationTools.getVaultStats(input);
            return { content: [{ type: 'text', text: result }] };
          }

          case 'obsidian_get_graph_view': {
            const input = GetGraphViewSchema.parse(args);
            const result = await navigationTools.getGraphView(input);
            return { content: [{ type: 'text', text: result }] };
          }

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    });

    // Start server
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Obsidian MCP Server running on stdio');
    console.error(`Vault path: ${vaultPath}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
