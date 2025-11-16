/**
 * Core vault operations service
 * Handles all file system interactions and markdown parsing
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import {
  Note,
  NoteFrontmatter,
  ParsedLink,
  SearchResult,
  TagInfo,
  FolderInfo,
  VaultStats,
} from '../types.js';
import {
  WIKI_LINK_REGEX,
  MARKDOWN_LINK_REGEX,
  TAG_REGEX,
  MARKDOWN_EXTENSIONS,
  SCORE_WEIGHTS,
  SEARCH_SNIPPET_LENGTH,
  ERROR_MESSAGES,
} from '../constants.js';

export class VaultService {
  private vaultPath: string;

  constructor(vaultPath: string) {
    this.vaultPath = vaultPath;
  }

  /**
   * Validates that vault path exists and is accessible
   */
  async validateVault(): Promise<void> {
    try {
      const stats = await fs.stat(this.vaultPath);
      if (!stats.isDirectory()) {
        throw new Error(ERROR_MESSAGES.VAULT_NOT_FOUND);
      }
    } catch (error) {
      throw new Error(ERROR_MESSAGES.VAULT_NOT_FOUND);
    }
  }

  /**
   * Get absolute path from relative vault path
   */
  getAbsolutePath(relativePath: string): string {
    // Remove leading slash if present
    const cleanPath = relativePath.startsWith('/')
      ? relativePath.slice(1)
      : relativePath;
    return path.join(this.vaultPath, cleanPath);
  }

  /**
   * Get relative path from absolute path
   */
  getRelativePath(absolutePath: string): string {
    return path.relative(this.vaultPath, absolutePath);
  }

  /**
   * Check if a path is a markdown file
   */
  isMarkdownFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return MARKDOWN_EXTENSIONS.includes(ext);
  }

  /**
   * Parse markdown content and extract metadata
   */
  parseNote(filePath: string, content: string, stats: { mtime: Date; birthtime: Date }): Note {
    const parsed = matter(content);
    const frontmatter = parsed.data as NoteFrontmatter;

    // Extract tags from content
    const tags = this.extractTags(parsed.content, frontmatter.tags);

    // Extract links
    const links = this.extractLinks(parsed.content);

    // Extract headings
    const headings = this.extractHeadings(parsed.content);

    // Extract block references
    const blocks = this.extractBlocks(parsed.content);

    const relativePath = this.getRelativePath(filePath);
    const name = path.basename(filePath, path.extname(filePath));

    return {
      path: relativePath,
      name,
      content: parsed.content,
      frontmatter: Object.keys(frontmatter).length > 0 ? frontmatter : null,
      tags,
      links: links.map(l => l.target),
      headings,
      blocks,
      created: stats.birthtime,
      modified: stats.mtime,
    };
  }

  /**
   * Extract tags from content and frontmatter
   */
  extractTags(content: string, frontmatterTags?: string[]): string[] {
    const tags = new Set<string>();

    // Add frontmatter tags
    if (frontmatterTags) {
      frontmatterTags.forEach(tag => {
        // Remove leading # if present
        const cleanTag = tag.startsWith('#') ? tag.slice(1) : tag;
        tags.add(cleanTag);
      });
    }

    // Extract inline tags
    const tagMatches = content.matchAll(TAG_REGEX);
    for (const match of tagMatches) {
      tags.add(match[1]);
    }

    return Array.from(tags);
  }

  /**
   * Extract and parse all links from content
   */
  extractLinks(content: string): ParsedLink[] {
    const links: ParsedLink[] = [];

    // Parse wiki-style links: !?[[target#heading^blockRef|displayText]]
    const wikiMatches = content.matchAll(WIKI_LINK_REGEX);
    for (const match of wikiMatches) {
      const isEmbed = match[0].startsWith('!');
      const target = match[1];
      const heading = match[2];
      const blockRef = match[3];
      const displayText = match[4];

      links.push({
        raw: match[0],
        original: match[0],
        target,
        heading,
        blockRef,
        displayText,
        isEmbed,
      });
    }

    // Parse markdown links
    const mdMatches = content.matchAll(MARKDOWN_LINK_REGEX);
    for (const match of mdMatches) {
      const isEmbed = match[0].startsWith('!');
      const displayText = match[1];
      const target = match[2];

      // Only include internal links (not URLs)
      if (!target.startsWith('http://') && !target.startsWith('https://')) {
        links.push({
          raw: match[0],
          original: match[0],
          target,
          displayText,
          isEmbed,
        });
      }
    }

    return links;
  }

  /**
   * Extract headings from content
   */
  extractHeadings(content: string): { text: string; level: number; line: number }[] {
    const headings: { text: string; level: number; line: number }[] = [];
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = /^(#{1,6})\s+(.+?)(?:\s+\^[a-zA-Z0-9-]+)?\s*$/.exec(line);

      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].trim(),
          line: i + 1,
        });
      }
    }

    return headings;
  }

  /**
   * Extract block references from content
   */
  extractBlocks(content: string): Record<string, number> {
    const blocks: Record<string, number> = {};
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = /\^([a-zA-Z0-9-]+)\s*$/.exec(line);

      if (match) {
        blocks[match[1]] = i + 1;
      }
    }

    return blocks;
  }

  /**
   * Read a note by path
   */
  async readNote(relativePath: string): Promise<Note> {
    const absolutePath = this.getAbsolutePath(relativePath);

    try {
      const content = await fs.readFile(absolutePath, 'utf-8');
      const stats = await fs.stat(absolutePath);

      return this.parseNote(absolutePath, content, {
        mtime: stats.mtime,
        birthtime: stats.birthtime,
      });
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES.NOTE_NOT_FOUND}: ${relativePath}`);
    }
  }

  /**
   * Find a note by title (fuzzy matching)
   */
  async findNoteByTitle(title: string): Promise<Note | null> {
    const notes = await this.getAllNotes();

    // First try exact match
    const exactMatch = notes.find(n =>
      n.name.toLowerCase() === title.toLowerCase()
    );
    if (exactMatch) return exactMatch;

    // Try frontmatter title match
    const titleMatch = notes.find(n =>
      n.frontmatter?.title?.toLowerCase() === title.toLowerCase()
    );
    if (titleMatch) return titleMatch;

    // Try alias match
    const aliasMatch = notes.find(n =>
      n.frontmatter?.aliases?.some(alias =>
        alias.toLowerCase() === title.toLowerCase()
      )
    );
    if (aliasMatch) return aliasMatch;

    // Try partial match
    const partialMatch = notes.find(n =>
      n.name.toLowerCase().includes(title.toLowerCase())
    );
    if (partialMatch) return partialMatch;

    return null;
  }

  /**
   * Get suggestions for a note title
   */
  async getSuggestions(title: string, limit: number = 5): Promise<string[]> {
    const notes = await this.getAllNotes();
    const lowerTitle = title.toLowerCase();

    const suggestions = notes
      .filter(n => n.name.toLowerCase().includes(lowerTitle))
      .slice(0, limit)
      .map(n => n.name);

    return suggestions;
  }

  /**
   * Create a new note
   */
  async createNote(
    relativePath: string,
    content: string,
    frontmatter?: NoteFrontmatter,
    createFolders: boolean = true
  ): Promise<Note> {
    const absolutePath = this.getAbsolutePath(relativePath);

    // Create parent directories if needed
    if (createFolders) {
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
    }

    // Prepare content with frontmatter
    let fullContent = content;
    if (frontmatter && Object.keys(frontmatter).length > 0) {
      const fm = matter.stringify(content, frontmatter);
      fullContent = fm;
    }

    await fs.writeFile(absolutePath, fullContent, 'utf-8');

    // Read back the created note
    return await this.readNote(relativePath);
  }

  /**
   * Update an existing note
   */
  async updateNote(
    relativePath: string,
    content?: string,
    frontmatter?: NoteFrontmatter,
    append: boolean = false
  ): Promise<Note> {
    const existing = await this.readNote(relativePath);
    const absolutePath = this.getAbsolutePath(relativePath);

    // Determine new content
    let newContent = content !== undefined ? content : existing.content;
    if (append && content) {
      newContent = existing.content + '\n\n' + content;
    }

    // Merge frontmatter
    const newFrontmatter = frontmatter
      ? { ...existing.frontmatter, ...frontmatter }
      : existing.frontmatter;

    // Write updated note
    let fullContent = newContent;
    if (newFrontmatter && Object.keys(newFrontmatter).length > 0) {
      fullContent = matter.stringify(newContent, newFrontmatter);
    }

    await fs.writeFile(absolutePath, fullContent, 'utf-8');

    // Read back the updated note
    return await this.readNote(relativePath);
  }

  /**
   * Delete a note
   */
  async deleteNote(relativePath: string): Promise<void> {
    const absolutePath = this.getAbsolutePath(relativePath);

    try {
      await fs.unlink(absolutePath);
    } catch (error) {
      throw new Error(`${ERROR_MESSAGES.NOTE_NOT_FOUND}: ${relativePath}`);
    }
  }

  /**
   * Get all notes in the vault
   */
  async getAllNotes(folder?: string): Promise<Note[]> {
    const notes: Note[] = [];
    const searchPath = folder
      ? this.getAbsolutePath(folder)
      : this.vaultPath;

    await this.scanDirectory(searchPath, notes);
    return notes;
  }

  /**
   * Recursively scan directory for markdown files
   */
  private async scanDirectory(dir: string, notes: Note[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden files and .obsidian folder
        if (entry.name.startsWith('.')) continue;

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, notes);
        } else if (entry.isFile() && this.isMarkdownFile(entry.name)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const stats = await fs.stat(fullPath);
            const note = this.parseNote(fullPath, content, {
              mtime: stats.mtime,
              birthtime: stats.birthtime,
            });
            notes.push(note);
          } catch (error) {
            // Skip files that can't be read
            continue;
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be accessed
    }
  }

  /**
   * Search notes by content
   */
  async searchContent(
    query: string,
    options: {
      folder?: string;
      tag?: string;
      caseSensitive?: boolean;
      limit?: number;
    } = {}
  ): Promise<SearchResult[]> {
    const notes = await this.getAllNotes(options.folder);
    const results: SearchResult[] = [];

    const searchQuery = options.caseSensitive ? query : query.toLowerCase();

    for (const note of notes) {
      // Apply tag filter
      if (options.tag && !note.tags.includes(options.tag)) {
        continue;
      }

      const noteContent = options.caseSensitive ? note.content : note.content.toLowerCase();
      const noteName = options.caseSensitive ? note.name : note.name.toLowerCase();

      // Check title match
      if (noteName.includes(searchQuery)) {
        const score = noteName === searchQuery
          ? SCORE_WEIGHTS.TITLE_EXACT
          : SCORE_WEIGHTS.TITLE_PARTIAL;

        results.push({
          path: note.path,
          name: note.name,
          score,
          matchType: 'title',
        });
        continue;
      }

      // Check frontmatter title
      if (note.frontmatter?.title) {
        const fmTitle = options.caseSensitive
          ? note.frontmatter.title
          : note.frontmatter.title.toLowerCase();

        if (fmTitle.includes(searchQuery)) {
          results.push({
            path: note.path,
            name: note.name,
            score: SCORE_WEIGHTS.TITLE_PARTIAL,
            matchType: 'title',
          });
          continue;
        }
      }

      // Check content match
      const index = noteContent.indexOf(searchQuery);
      if (index !== -1) {
        // Calculate score based on position
        const positionRatio = index / noteContent.length;
        const score = positionRatio < 0.2
          ? SCORE_WEIGHTS.CONTENT_EARLY
          : SCORE_WEIGHTS.CONTENT_LATE;

        // Extract snippet
        const start = Math.max(0, index - 50);
        const end = Math.min(noteContent.length, index + SEARCH_SNIPPET_LENGTH);
        const snippet = (start > 0 ? '...' : '') +
                       note.content.substring(start, end) +
                       (end < noteContent.length ? '...' : '');

        results.push({
          path: note.path,
          name: note.name,
          score,
          snippet,
          matchType: 'content',
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Apply limit
    return options.limit ? results.slice(0, options.limit) : results;
  }

  /**
   * Get all tags with usage counts
   */
  async getAllTags(): Promise<TagInfo[]> {
    const notes = await this.getAllNotes();
    const tagCounts = new Map<string, number>();

    for (const note of notes) {
      for (const tag of note.tags) {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      }
    }

    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get all folders in the vault
   */
  async getAllFolders(parentPath?: string, recursive: boolean = false): Promise<FolderInfo[]> {
    const folders: FolderInfo[] = [];
    const searchPath = parentPath
      ? this.getAbsolutePath(parentPath)
      : this.vaultPath;

    await this.scanFolders(searchPath, folders, recursive);
    return folders;
  }

  /**
   * Recursively scan for folders
   */
  private async scanFolders(
    dir: string,
    folders: FolderInfo[],
    recursive: boolean
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = this.getRelativePath(fullPath);

          // Count notes in this folder
          const notes = await fs.readdir(fullPath);
          const noteCount = notes.filter(n => this.isMarkdownFile(n)).length;

          // Get subfolders
          const subfolderEntries = await fs.readdir(fullPath, { withFileTypes: true });
          const subfolders = subfolderEntries
            .filter(e => e.isDirectory() && !e.name.startsWith('.'))
            .map(e => path.join(relativePath, e.name));

          folders.push({
            path: relativePath,
            name: entry.name,
            noteCount,
            subfolders,
          });

          if (recursive) {
            await this.scanFolders(fullPath, folders, recursive);
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be accessed
    }
  }

  /**
   * Get vault statistics
   */
  async getVaultStats(): Promise<VaultStats> {
    const notes = await this.getAllNotes();
    const tags = await this.getAllTags();
    const folders = await this.getAllFolders(undefined, true);

    const totalLinks = notes.reduce((sum, note) => sum + note.links.length, 0);
    const totalLength = notes.reduce((sum, note) => sum + note.content.length, 0);
    const averageNoteLength = notes.length > 0 ? Math.round(totalLength / notes.length) : 0;

    // Count orphan notes (notes with no backlinks)
    const backlinks = new Map<string, number>();
    for (const note of notes) {
      for (const link of note.links) {
        backlinks.set(link, (backlinks.get(link) || 0) + 1);
      }
    }

    const orphanNotes = notes.filter(note => {
      const noteNameWithoutExt = note.name;
      return !backlinks.has(noteNameWithoutExt) && !backlinks.has(note.path);
    }).length;

    return {
      totalNotes: notes.length,
      totalTags: tags.length,
      totalLinks,
      totalFolders: folders.length,
      averageNoteLength,
      orphanNotes,
    };
  }

  /**
   * Get all notes that link to the target note
   */
  async getBacklinks(targetPath: string): Promise<string[]> {
    const notes = await this.getAllNotes();
    const targetNote = await this.readNote(targetPath);
    const backlinks: string[] = [];

    for (const note of notes) {
      if (note.path === targetPath) continue;

      // Check if any link matches the target
      for (const link of note.links) {
        if (this.linksMatch(link, targetNote)) {
          backlinks.push(note.path);
          break;
        }
      }
    }

    return backlinks;
  }

  /**
   * Check if a link target matches a note
   */
  private linksMatch(linkTarget: string, note: Note): boolean {
    // Remove .md extension if present
    const cleanLink = linkTarget.endsWith('.md')
      ? linkTarget.slice(0, -3)
      : linkTarget;

    // Check if link matches note name
    if (cleanLink.toLowerCase() === note.name.toLowerCase()) {
      return true;
    }

    // Check if link matches note path
    const cleanNotePath = note.path.endsWith('.md')
      ? note.path.slice(0, -3)
      : note.path;

    if (cleanLink.toLowerCase() === cleanNotePath.toLowerCase()) {
      return true;
    }

    // Check aliases
    if (note.frontmatter?.aliases) {
      return note.frontmatter.aliases.some(alias =>
        alias.toLowerCase() === cleanLink.toLowerCase()
      );
    }

    return false;
  }

  /**
   * Find unlinked references to a note
   */
  async getUnlinkedReferences(targetPath: string, limit: number = 50): Promise<SearchResult[]> {
    const targetNote = await this.readNote(targetPath);
    const notes = await this.getAllNotes();
    const results: SearchResult[] = [];

    // Search for note name in content (but not in links)
    const searchTerms = [targetNote.name];
    if (targetNote.frontmatter?.aliases) {
      searchTerms.push(...targetNote.frontmatter.aliases);
    }

    for (const note of notes) {
      if (note.path === targetPath) continue;

      // Check if note already has a link to target
      const hasLink = note.links.some(link => this.linksMatch(link, targetNote));
      if (hasLink) continue;

      // Search for mentions
      for (const term of searchTerms) {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        const matches = note.content.match(regex);

        if (matches) {
          const index = note.content.toLowerCase().indexOf(term.toLowerCase());
          const start = Math.max(0, index - 50);
          const end = Math.min(note.content.length, index + SEARCH_SNIPPET_LENGTH);
          const snippet = (start > 0 ? '...' : '') +
                         note.content.substring(start, end) +
                         (end < note.content.length ? '...' : '');

          results.push({
            path: note.path,
            name: note.name,
            score: matches.length,
            snippet,
            matchType: 'content',
          });
          break;
        }
      }
    }

    return results.slice(0, limit);
  }
}
