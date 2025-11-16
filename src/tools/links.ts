/**
 * Link analysis tools
 * Implements backlink analysis, orphan detection, and unlinked references
 */

import { VaultService } from '../services/vault.js';
import { SearchResult } from '../types.js';
import {
  GetBacklinksInput,
  GetOutlinksInput,
  GetOrphansInput,
  GetUnlinkedReferencesInput,
} from '../schemas/validation.js';

export class LinkTools {
  constructor(private vault: VaultService) {}

  /**
   * Format link list as markdown
   */
  private formatLinksMarkdown(links: string[], title: string): string {
    if (links.length === 0) {
      return `# ${title}\n\nNo links found.`;
    }

    const parts: string[] = [];
    parts.push(`# ${title} (${links.length})\n`);

    for (const link of links) {
      parts.push(`- [[${link}]]`);
    }

    return parts.join('\n');
  }

  /**
   * Format unlinked references as markdown
   */
  private formatUnlinkedReferencesMarkdown(refs: SearchResult[]): string {
    if (refs.length === 0) {
      return '# Unlinked References\n\nNo unlinked references found.';
    }

    const parts: string[] = [];
    parts.push(`# Unlinked References (${refs.length})\n`);

    for (const ref of refs) {
      parts.push(`## ${ref.name}`);
      parts.push(`- **Path**: ${ref.path}`);
      parts.push(`- **Mentions**: ${ref.score}`);

      if (ref.snippet) {
        parts.push(`- **Context**: ${ref.snippet}`);
      }

      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Get all notes that link to the target note
   */
  async getBacklinks(input: GetBacklinksInput): Promise<string> {
    const backlinks = await this.vault.getBacklinks(input.path);

    if (input.format === 'json') {
      return JSON.stringify({
        target: input.path,
        backlinks,
        total: backlinks.length,
      }, null, 2);
    } else {
      return this.formatLinksMarkdown(
        backlinks,
        `Backlinks to ${input.path}`
      );
    }
  }

  /**
   * Get all links from a note
   */
  async getOutlinks(input: GetOutlinksInput): Promise<string> {
    const note = await this.vault.readNote(input.path);

    if (input.format === 'json') {
      return JSON.stringify({
        source: input.path,
        outlinks: note.links,
        total: note.links.length,
      }, null, 2);
    } else {
      return this.formatLinksMarkdown(
        note.links,
        `Outgoing links from ${input.path}`
      );
    }
  }

  /**
   * Find notes with no backlinks (orphan notes)
   */
  async getOrphans(input: GetOrphansInput): Promise<string> {
    const allNotes = await this.vault.getAllNotes();
    const orphans: string[] = [];

    // Build a map of all backlinks
    const hasBacklinks = new Set<string>();

    for (const note of allNotes) {
      for (const link of note.links) {
        // Try to find the target note
        const targetNote = await this.vault.findNoteByTitle(link);
        if (targetNote) {
          hasBacklinks.add(targetNote.path);
        }
      }
    }

    // Find notes without backlinks
    for (const note of allNotes) {
      if (!hasBacklinks.has(note.path)) {
        orphans.push(note.path);
      }
    }

    if (input.format === 'json') {
      return JSON.stringify({
        orphans,
        total: orphans.length,
      }, null, 2);
    } else {
      return this.formatLinksMarkdown(orphans, 'Orphan Notes');
    }
  }

  /**
   * Find unlinked references (mentions without links)
   */
  async getUnlinkedReferences(input: GetUnlinkedReferencesInput): Promise<string> {
    const refs = await this.vault.getUnlinkedReferences(input.path, input.limit);

    if (input.format === 'json') {
      return JSON.stringify({
        target: input.path,
        references: refs,
        total: refs.length,
      }, null, 2);
    } else {
      return this.formatUnlinkedReferencesMarkdown(refs);
    }
  }
}
