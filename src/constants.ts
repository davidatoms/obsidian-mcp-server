/**
 * Shared constants for Obsidian MCP Server
 */

export const WIKI_LINK_REGEX = /!?\[\[([^\]|#^]+)(?:#([^\]|^]+))?(?:\^([^\]|]+))?(?:\|([^\]]+))?\]\]/g;
export const MARKDOWN_LINK_REGEX = /!?\[([^\]]*)\]\(([^)]+)\)/g;
export const TAG_REGEX = /#([a-zA-Z0-9_/-]+)/g;
export const HEADING_REGEX = /^(#{1,6})\s+(.+?)(?:\s+\^([a-zA-Z0-9-]+))?\s*$/gm;
export const BLOCK_REF_REGEX = /\^([a-zA-Z0-9-]+)\s*$/gm;
export const DATAVIEW_INLINE_REGEX = /(\w+)::\s*(.+)/g;

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 1000;
export const SEARCH_SNIPPET_LENGTH = 150;
export const MAX_SEARCH_RESULTS = 5000;

export const SCORE_WEIGHTS = {
  TITLE_EXACT: 100,
  TITLE_PARTIAL: 50,
  HEADING: 30,
  CONTENT_EARLY: 20,
  CONTENT_LATE: 5,
  TAG: 40,
  FRONTMATTER: 35,
} as const;

export const DATE_FORMAT_REGEX = /^\d{4}-\d{2}-\d{2}$/;
export const DAILY_NOTE_FORMAT = 'YYYY-MM-DD';

export const MARKDOWN_EXTENSIONS = ['.md', '.markdown'];

export const ERROR_MESSAGES = {
  VAULT_NOT_FOUND: 'Vault path not found or not accessible',
  VAULT_NOT_CONFIGURED: 'Vault path not configured. Set OBSIDIAN_VAULT_PATH environment variable or use --vault-path argument',
  NOTE_NOT_FOUND: 'Note not found',
  INVALID_PATH: 'Invalid path: paths must be relative to vault root',
  TOO_MANY_RESULTS: 'Search returned too many results. Use folder or tag filters to narrow down results',
  INVALID_DATE: 'Invalid date format. Expected YYYY-MM-DD',
} as const;
