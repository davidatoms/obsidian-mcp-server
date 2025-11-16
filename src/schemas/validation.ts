/**
 * Zod validation schemas for all MCP tools
 */

import { z } from 'zod';

// Common schemas
export const ResponseFormatSchema = z.enum(['markdown', 'json']).default('markdown');

export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),
}).strict();

// Note management schemas
export const GetNoteSchema = z.object({
  path: z.string().optional().describe('Path to the note relative to vault root'),
  title: z.string().optional().describe('Note title for fuzzy matching'),
  format: ResponseFormatSchema,
}).strict().refine(data => data.path || data.title, {
  message: 'Either path or title must be provided',
});

export const CreateNoteSchema = z.object({
  path: z.string().describe('Path where note should be created (including filename)'),
  content: z.string().describe('Note content'),
  frontmatter: z.record(z.unknown()).optional().describe('YAML frontmatter as key-value pairs'),
  createFolders: z.boolean().default(true).describe('Create parent folders if they don\'t exist'),
  format: ResponseFormatSchema,
}).strict();

export const UpdateNoteSchema = z.object({
  path: z.string().describe('Path to the note to update'),
  content: z.string().optional().describe('New content (replaces existing)'),
  frontmatter: z.record(z.unknown()).optional().describe('Frontmatter to update/merge'),
  append: z.boolean().default(false).describe('Append content instead of replacing'),
  format: ResponseFormatSchema,
}).strict();

export const DeleteNoteSchema = z.object({
  path: z.string().describe('Path to the note to delete'),
  confirm: z.boolean().describe('Confirmation flag (must be true)'),
}).strict();

export const ListNotesSchema = z.object({
  folder: z.string().optional().describe('Filter by folder path'),
  tag: z.string().optional().describe('Filter by tag'),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),
  format: ResponseFormatSchema,
}).strict();

// Search schemas
export const SearchContentSchema = z.object({
  query: z.string().describe('Search query string'),
  folder: z.string().optional().describe('Limit search to specific folder'),
  tag: z.string().optional().describe('Limit search to notes with specific tag'),
  caseSensitive: z.boolean().default(false).describe('Case-sensitive search'),
  limit: z.number().int().positive().max(1000).default(50),
  format: ResponseFormatSchema,
}).strict();

export const SearchTagsSchema = z.object({
  tag: z.string().describe('Tag to search for (supports prefix matching)'),
  format: ResponseFormatSchema,
}).strict();

export const ListTagsSchema = z.object({
  sortBy: z.enum(['name', 'count']).default('count').describe('Sort tags by name or usage count'),
  format: ResponseFormatSchema,
}).strict();

export const SearchFrontmatterSchema = z.object({
  field: z.string().describe('Frontmatter field name'),
  value: z.string().optional().describe('Field value to match (omit to find notes with field present)'),
  limit: z.number().int().positive().max(1000).default(50),
  format: ResponseFormatSchema,
}).strict();

// Link analysis schemas
export const GetBacklinksSchema = z.object({
  path: z.string().describe('Path to the target note'),
  format: ResponseFormatSchema,
}).strict();

export const GetOutlinksSchema = z.object({
  path: z.string().describe('Path to the source note'),
  format: ResponseFormatSchema,
}).strict();

export const GetOrphansSchema = z.object({
  format: ResponseFormatSchema,
}).strict();

export const GetUnlinkedReferencesSchema = z.object({
  path: z.string().describe('Path to the target note'),
  limit: z.number().int().positive().default(50),
  format: ResponseFormatSchema,
}).strict();

// Vault navigation schemas
export const ListFoldersSchema = z.object({
  path: z.string().optional().describe('Parent folder path (omit for vault root)'),
  recursive: z.boolean().default(false).describe('List all subfolders recursively'),
  format: ResponseFormatSchema,
}).strict();

export const GetDailyNoteSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date in YYYY-MM-DD format (defaults to today)'),
  create: z.boolean().default(true).describe('Create the daily note if it doesn\'t exist'),
  format: ResponseFormatSchema,
}).strict();

export const GetVaultStatsSchema = z.object({
  format: ResponseFormatSchema,
}).strict();

export const GetGraphViewSchema = z.object({
  folder: z.string().optional().describe('Limit graph to notes in specific folder'),
  maxDepth: z.number().int().positive().max(5).default(2).describe('Maximum depth of connections to show'),
  maxNotes: z.number().int().positive().max(100).default(50).describe('Maximum number of notes to include'),
  centralNote: z.string().optional().describe('Center the graph on a specific note path'),
  format: z.enum(['ascii', 'mermaid', 'json']).default('ascii').describe('Output format: ascii for terminal, mermaid for diagram, json for data'),
}).strict();

// Type inference helpers
export type GetNoteInput = z.infer<typeof GetNoteSchema>;
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
export type DeleteNoteInput = z.infer<typeof DeleteNoteSchema>;
export type ListNotesInput = z.infer<typeof ListNotesSchema>;
export type SearchContentInput = z.infer<typeof SearchContentSchema>;
export type SearchTagsInput = z.infer<typeof SearchTagsSchema>;
export type ListTagsInput = z.infer<typeof ListTagsSchema>;
export type SearchFrontmatterInput = z.infer<typeof SearchFrontmatterSchema>;
export type GetBacklinksInput = z.infer<typeof GetBacklinksSchema>;
export type GetOutlinksInput = z.infer<typeof GetOutlinksSchema>;
export type GetOrphansInput = z.infer<typeof GetOrphansSchema>;
export type GetUnlinkedReferencesInput = z.infer<typeof GetUnlinkedReferencesSchema>;
export type ListFoldersInput = z.infer<typeof ListFoldersSchema>;
export type GetDailyNoteInput = z.infer<typeof GetDailyNoteSchema>;
export type GetVaultStatsInput = z.infer<typeof GetVaultStatsSchema>;
export type GetGraphViewInput = z.infer<typeof GetGraphViewSchema>;
