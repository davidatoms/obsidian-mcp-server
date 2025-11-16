/**
 * Search and discovery tools
 * Implements content search, tag search, and frontmatter queries
 */

import { VaultService } from '../services/vault.js';
import { SearchResult, TagInfo } from '../types.js';
import {
  SearchContentInput,
  SearchTagsInput,
  ListTagsInput,
  SearchFrontmatterInput,
} from '../schemas/validation.js';

export class SearchTools {
  constructor(private vault: VaultService) {}

  /**
   * Format search results as markdown
   */
  private formatSearchResultsMarkdown(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No results found.';
    }

    const parts: string[] = [];
    parts.push(`# Search Results (${results.length})\n`);

    for (const result of results) {
      parts.push(`## ${result.name}`);
      parts.push(`- **Path**: ${result.path}`);
      parts.push(`- **Match Type**: ${result.matchType}`);
      parts.push(`- **Relevance Score**: ${result.score}`);

      if (result.snippet) {
        parts.push(`- **Snippet**: ${result.snippet}`);
      }

      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Format tags as markdown
   */
  private formatTagsMarkdown(tags: TagInfo[], sortBy: string): string {
    if (tags.length === 0) {
      return 'No tags found.';
    }

    const parts: string[] = [];
    parts.push(`# Tags (${tags.length})\n`);
    parts.push(`*Sorted by ${sortBy}*\n`);

    for (const tag of tags) {
      parts.push(`- #${tag.tag} (${tag.count} notes)`);
    }

    return parts.join('\n');
  }

  /**
   * Search note content
   */
  async searchContent(input: SearchContentInput): Promise<string> {
    const results = await this.vault.searchContent(input.query, {
      folder: input.folder,
      tag: input.tag,
      caseSensitive: input.caseSensitive,
      limit: input.limit,
    });

    if (input.format === 'json') {
      return JSON.stringify({
        query: input.query,
        results,
        total: results.length,
      }, null, 2);
    } else {
      return this.formatSearchResultsMarkdown(results);
    }
  }

  /**
   * Search for notes by tag
   */
  async searchTags(input: SearchTagsInput): Promise<string> {
    const allNotes = await this.vault.getAllNotes();

    // Remove leading # if present
    const searchTag = input.tag.startsWith('#') ? input.tag.slice(1) : input.tag;

    // Find notes with exact or prefix match
    const matchingNotes = allNotes.filter(note =>
      note.tags.some(tag =>
        tag === searchTag || tag.startsWith(`${searchTag}/`)
      )
    );

    if (input.format === 'json') {
      return JSON.stringify({
        tag: searchTag,
        notes: matchingNotes.map(n => ({
          path: n.path,
          name: n.name,
          tags: n.tags,
        })),
        total: matchingNotes.length,
      }, null, 2);
    } else {
      const parts: string[] = [];
      parts.push(`# Notes tagged with #${searchTag} (${matchingNotes.length})\n`);

      for (const note of matchingNotes) {
        parts.push(`## ${note.name}`);
        parts.push(`- **Path**: ${note.path}`);
        parts.push(`- **Tags**: ${note.tags.map(t => `#${t}`).join(', ')}`);
        parts.push('');
      }

      return parts.join('\n');
    }
  }

  /**
   * List all tags with usage counts
   */
  async listTags(input: ListTagsInput): Promise<string> {
    let tags = await this.vault.getAllTags();

    // Sort by name or count
    if (input.sortBy === 'name') {
      tags.sort((a, b) => a.tag.localeCompare(b.tag));
    }
    // Already sorted by count by default

    if (input.format === 'json') {
      return JSON.stringify({
        tags,
        total: tags.length,
        sortBy: input.sortBy,
      }, null, 2);
    } else {
      return this.formatTagsMarkdown(tags, input.sortBy);
    }
  }

  /**
   * Search notes by frontmatter field
   */
  async searchFrontmatter(input: SearchFrontmatterInput): Promise<string> {
    const allNotes = await this.vault.getAllNotes();

    const matchingNotes = allNotes.filter(note => {
      if (!note.frontmatter) return false;

      const fieldValue = note.frontmatter[input.field];

      // If no value specified, just check if field exists
      if (input.value === undefined) {
        return fieldValue !== undefined;
      }

      // Check if field value matches
      if (Array.isArray(fieldValue)) {
        return fieldValue.some(v => String(v) === input.value);
      }

      return String(fieldValue) === input.value;
    });

    if (input.format === 'json') {
      return JSON.stringify({
        field: input.field,
        value: input.value,
        notes: matchingNotes.map(n => ({
          path: n.path,
          name: n.name,
          frontmatter: n.frontmatter,
        })),
        total: matchingNotes.length,
      }, null, 2);
    } else {
      const parts: string[] = [];
      const queryDesc = input.value
        ? `with ${input.field}="${input.value}"`
        : `with field "${input.field}"`;
      parts.push(`# Notes ${queryDesc} (${matchingNotes.length})\n`);

      for (const note of matchingNotes) {
        parts.push(`## ${note.name}`);
        parts.push(`- **Path**: ${note.path}`);
        parts.push(`- **${input.field}**: ${JSON.stringify(note.frontmatter![input.field])}`);
        parts.push('');
      }

      return parts.join('\n');
    }
  }
}
