/**
 * Note management tools
 * Implements CRUD operations for Obsidian notes
 */

import { VaultService } from '../services/vault.js';
import { Note } from '../types.js';
import {
  GetNoteInput,
  CreateNoteInput,
  UpdateNoteInput,
  DeleteNoteInput,
  ListNotesInput,
} from '../schemas/validation.js';

export class NoteTools {
  constructor(private vault: VaultService) {}

  /**
   * Format note as markdown
   */
  private formatNoteMarkdown(note: Note): string {
    const parts: string[] = [];

    parts.push(`# ${note.name}\n`);
    parts.push(`**Path**: ${note.path}`);

    if (note.tags.length > 0) {
      parts.push(`**Tags**: ${note.tags.map(t => `#${t}`).join(', ')}`);
    }

    if (note.links.length > 0) {
      parts.push(`**Links**: ${note.links.map(l => `[[${l}]]`).join(', ')}`);
    }

    if (note.backlinks && note.backlinks.length > 0) {
      parts.push(`**Backlinks**: ${note.backlinks.map(l => `[[${l}]]`).join(', ')}`);
    }

    parts.push(`**Created**: ${note.created.toISOString()}`);
    parts.push(`**Modified**: ${note.modified.toISOString()}`);

    if (note.frontmatter) {
      parts.push(`\n## Frontmatter\n\`\`\`yaml\n${JSON.stringify(note.frontmatter, null, 2)}\n\`\`\``);
    }

    parts.push(`\n## Content\n\n${note.content}`);

    return parts.join('\n');
  }

  /**
   * Format note list as markdown
   */
  private formatNoteListMarkdown(notes: Note[], total: number, offset: number): string {
    const parts: string[] = [];

    parts.push(`# Notes (${notes.length} of ${total})\n`);

    if (offset > 0) {
      parts.push(`*Showing results ${offset + 1}-${offset + notes.length}*\n`);
    }

    for (const note of notes) {
      parts.push(`## ${note.name}`);
      parts.push(`- **Path**: ${note.path}`);
      if (note.tags.length > 0) {
        parts.push(`- **Tags**: ${note.tags.map(t => `#${t}`).join(', ')}`);
      }
      parts.push(`- **Modified**: ${note.modified.toISOString()}`);
      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Get a note by path or title
   */
  async getNote(input: GetNoteInput): Promise<string> {
    let note: Note | null = null;

    if (input.path) {
      note = await this.vault.readNote(input.path);
    } else if (input.title) {
      note = await this.vault.findNoteByTitle(input.title);

      if (!note) {
        const suggestions = await this.vault.getSuggestions(input.title);
        const suggestionText = suggestions.length > 0
          ? ` Did you mean: ${suggestions.join(', ')}?`
          : '';
        throw new Error(`Note not found: '${input.title}'.${suggestionText}`);
      }
    }

    if (!note) {
      throw new Error('Note not found');
    }

    if (input.format === 'json') {
      return JSON.stringify(note, null, 2);
    } else {
      return this.formatNoteMarkdown(note);
    }
  }

  /**
   * Create a new note
   */
  async createNote(input: CreateNoteInput): Promise<string> {
    // Ensure path has .md extension
    const notePath = input.path.endsWith('.md') ? input.path : `${input.path}.md`;

    const note = await this.vault.createNote(
      notePath,
      input.content,
      input.frontmatter,
      input.createFolders
    );

    if (input.format === 'json') {
      return JSON.stringify(note, null, 2);
    } else {
      return this.formatNoteMarkdown(note);
    }
  }

  /**
   * Update an existing note
   */
  async updateNote(input: UpdateNoteInput): Promise<string> {
    const note = await this.vault.updateNote(
      input.path,
      input.content,
      input.frontmatter,
      input.append
    );

    if (input.format === 'json') {
      return JSON.stringify(note, null, 2);
    } else {
      return this.formatNoteMarkdown(note);
    }
  }

  /**
   * Delete a note
   */
  async deleteNote(input: DeleteNoteInput): Promise<string> {
    if (!input.confirm) {
      throw new Error('Deletion must be confirmed with confirm: true');
    }

    await this.vault.deleteNote(input.path);

    return `Note deleted successfully: ${input.path}`;
  }

  /**
   * List notes with optional filters
   */
  async listNotes(input: ListNotesInput): Promise<string> {
    const allNotes = await this.vault.getAllNotes(input.folder);

    // Apply tag filter
    let filteredNotes = allNotes;
    if (input.tag) {
      filteredNotes = allNotes.filter(note => note.tags.includes(input.tag!));
    }

    // Sort by modified date (newest first)
    filteredNotes.sort((a, b) => b.modified.getTime() - a.modified.getTime());

    // Apply pagination
    const total = filteredNotes.length;
    const paginatedNotes = filteredNotes.slice(
      input.offset,
      input.offset + input.limit
    );

    if (input.format === 'json') {
      return JSON.stringify({
        notes: paginatedNotes,
        total,
        limit: input.limit,
        offset: input.offset,
      }, null, 2);
    } else {
      return this.formatNoteListMarkdown(paginatedNotes, total, input.offset);
    }
  }
}
