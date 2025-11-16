/**
 * Core TypeScript interfaces for Obsidian MCP Server
 */

export interface NoteFrontmatter {
  title?: string;
  tags?: string[];
  aliases?: string[];
  created?: string | Date;
  modified?: string | Date;
  status?: string;
  [key: string]: unknown;
}

export interface Heading {
  text: string;
  level: number;
  line: number;
}

export interface Note {
  path: string;
  name: string;
  content: string;
  frontmatter: NoteFrontmatter | null;
  tags: string[];
  links: string[];
  headings?: Heading[];
  blocks?: Record<string, number>;  // blockId -> line number
  backlinks?: string[];
  unresolvedLinks?: string[];
  created: Date;
  modified: Date;
}

export interface SearchResult {
  path: string;
  name: string;
  score: number;
  snippet?: string;
  matchType: 'title' | 'heading' | 'content' | 'tag' | 'frontmatter';
}

export interface Link {
  source: string;
  target: string;
  displayText?: string;
  isEmbed: boolean;
  heading?: string;
}

export interface VaultStats {
  totalNotes: number;
  totalTags: number;
  totalLinks: number;
  totalFolders: number;
  averageNoteLength: number;
  orphanNotes: number;
}

export interface TagInfo {
  tag: string;
  count: number;
}

export interface FolderInfo {
  path: string;
  name: string;
  noteCount: number;
  subfolders: string[];
}

export interface ParsedLink {
  raw: string;
  original: string;
  target: string;
  displayText?: string;
  heading?: string;
  blockRef?: string;
  isEmbed: boolean;
}

export interface VaultConfig {
  path: string;
  name: string;
}

export type ResponseFormat = 'markdown' | 'json';

export interface ToolResponse {
  format: ResponseFormat;
  data: unknown;
}
