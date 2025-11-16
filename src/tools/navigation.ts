/**
 * Vault navigation tools
 * Implements folder browsing, daily notes, and vault statistics
 */

import { VaultService } from '../services/vault.js';
import { FolderInfo, VaultStats, Note } from '../types.js';
import type {
  ListFoldersInput,
  GetDailyNoteInput,
  GetVaultStatsInput,
  GetGraphViewInput,
} from '../schemas/validation.js';
export class NavigationTools {
  constructor(private vault: VaultService) {}

  /**
   * Format folders as markdown
   */
  private formatFoldersMarkdown(folders: FolderInfo[]): string {
    if (folders.length === 0) {
      return '# Folders\n\nNo folders found.';
    }

    const parts: string[] = [];
    parts.push(`# Folders (${folders.length})\n`);

    for (const folder of folders) {
      parts.push(`## ${folder.name}`);
      parts.push(`- **Path**: ${folder.path}`);
      parts.push(`- **Notes**: ${folder.noteCount}`);

      if (folder.subfolders.length > 0) {
        parts.push(`- **Subfolders**: ${folder.subfolders.length}`);
        for (const sub of folder.subfolders) {
          parts.push(`  - ${sub}`);
        }
      }

      parts.push('');
    }

    return parts.join('\n');
  }

  /**
   * Format vault stats as markdown
   */
  private formatVaultStatsMarkdown(stats: VaultStats): string {
    const parts: string[] = [];

    parts.push('# Vault Statistics\n');
    parts.push(`- **Total Notes**: ${stats.totalNotes}`);
    parts.push(`- **Total Tags**: ${stats.totalTags}`);
    parts.push(`- **Total Links**: ${stats.totalLinks}`);
    parts.push(`- **Total Folders**: ${stats.totalFolders}`);
    parts.push(`- **Average Note Length**: ${stats.averageNoteLength} characters`);
    parts.push(`- **Orphan Notes**: ${stats.orphanNotes}`);

    return parts.join('\n');
  }

  /**
   * Format note as markdown (for daily note)
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

    parts.push(`**Created**: ${note.created.toISOString()}`);
    parts.push(`**Modified**: ${note.modified.toISOString()}`);

    if (note.frontmatter) {
      parts.push(`\n## Frontmatter\n\`\`\`yaml\n${JSON.stringify(note.frontmatter, null, 2)}\n\`\`\``);
    }

    parts.push(`\n## Content\n\n${note.content}`);

    return parts.join('\n');
  }

  /**
   * List folders in the vault
   */
  async listFolders(input: ListFoldersInput): Promise<string> {
    const folders = await this.vault.getAllFolders(input.path, input.recursive);

    if (input.format === 'json') {
      return JSON.stringify({
        folders,
        total: folders.length,
        path: input.path || '/',
        recursive: input.recursive,
      }, null, 2);
    } else {
      return this.formatFoldersMarkdown(folders);
    }
  }

  /**
   * Get or create a daily note
   */
  async getDailyNote(input: GetDailyNoteInput): Promise<string> {
    // Parse date or use today
    let date: Date;
    if (input.date) {
      date = new Date(input.date);
    } else {
      date = new Date();
    }

    // Format date as YYYY-MM-DD
    const dateStr = date.toISOString().split('T')[0];
    const notePath = `Daily Notes/${dateStr}.md`;

    try {
      // Try to read existing note
      const note = await this.vault.readNote(notePath);

      if (input.format === 'json') {
        return JSON.stringify(note, null, 2);
      } else {
        return this.formatNoteMarkdown(note);
      }
    } catch (error) {
      // Note doesn't exist
      if (!input.create) {
        throw new Error(`Daily note for ${dateStr} does not exist. Set create: true to create it.`);
      }

      // Create daily note
      const content = `# ${dateStr}\n\n## Tasks\n\n- [ ] \n\n## Notes\n\n`;
      const frontmatter = {
        created: date.toISOString(),
        tags: ['daily-note'],
      };

      const note = await this.vault.createNote(notePath, content, frontmatter, true);

      if (input.format === 'json') {
        return JSON.stringify(note, null, 2);
      } else {
        return this.formatNoteMarkdown(note);
      }
    }
  }

  /**
   * Get vault statistics
   */
  async getVaultStats(input: GetVaultStatsInput): Promise<string> {
    const stats = await this.vault.getVaultStats();

    if (input.format === 'json') {
      return JSON.stringify(stats, null, 2);
    } else {
      return this.formatVaultStatsMarkdown(stats);
    }
  }

  /**
   * Open Obsidian's graph view
   */
  async getGraphView(input: GetGraphViewInput): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    // Get vault path and name
    const vaultPath = this.vault['vaultPath'];
    const path = await import('path');
    const vaultName = path.basename(vaultPath);
    
    // Use vault parameter to ensure we open the correct vault
    let uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}`;
    
    if (input.centralNote) {
      // Open specific note in the vault
      const notePath = input.centralNote.replace(/\.md$/, '');
      uri = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(notePath)}`;
    }

    try {
      // Open the URI based on platform
      if (process.platform === 'win32') {
        await execAsync(`start "" "${uri}"`);
      } else if (process.platform === 'darwin') {
        await execAsync(`open "${uri}"`);
      } else {
        await execAsync(`xdg-open "${uri}"`);
      }

      return input.centralNote
        ? `✓ Opened Obsidian graph view centered on: ${input.centralNote}`
        : `✓ Opened Obsidian graph view`;
    } catch (error) {
      throw new Error(`Failed to open Obsidian: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
