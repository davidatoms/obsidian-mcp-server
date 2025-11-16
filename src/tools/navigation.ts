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
   * Generate graph view visualization
   */
  async getGraphView(input: GetGraphViewInput): Promise<string> {
    // Get all notes from specified folder or entire vault
    const allNotes = await this.vault.getAllNotes(input.folder);
    
    // If central note specified, start from there
    let notesToInclude: Note[];
    if (input.centralNote) {
      notesToInclude = await this.getConnectedNotes(
        input.centralNote,
        allNotes,
        input.maxDepth,
        input.maxNotes
      );
    } else {
      // Take most connected notes up to maxNotes
      notesToInclude = allNotes
        .sort((a, b) => (b.links.length + (b.backlinks?.length || 0)) - (a.links.length + (a.backlinks?.length || 0)))
        .slice(0, input.maxNotes);
    }

    // Build graph data
    const graphData = this.buildGraphData(notesToInclude);

    if (input.format === 'json') {
      return JSON.stringify(graphData, null, 2);
    } else {
      return this.generateMermaidGraph(graphData);
    }
  }

  /**
   * Get notes connected to a central note up to maxDepth
   */
  private async getConnectedNotes(
    centralPath: string,
    allNotes: Note[],
    maxDepth: number,
    maxNotes: number
  ): Promise<Note[]> {
    const included = new Set<string>();
    const result: Note[] = [];
    const queue: Array<{ path: string; depth: number }> = [{ path: centralPath, depth: 0 }];

    while (queue.length > 0 && result.length < maxNotes) {
      const current = queue.shift()!;
      
      if (included.has(current.path) || current.depth > maxDepth) {
        continue;
      }

      const note = allNotes.find(n => n.path === current.path);
      if (!note) continue;

      included.add(current.path);
      result.push(note);

      // Add connected notes to queue
      if (current.depth < maxDepth) {
        for (const link of note.links) {
          const linkedNote = allNotes.find(n => 
            n.path === link || 
            n.path === `${link}.md` ||
            n.name === link
          );
          if (linkedNote && !included.has(linkedNote.path)) {
            queue.push({ path: linkedNote.path, depth: current.depth + 1 });
          }
        }

        // Add backlinks
        if (note.backlinks) {
          for (const backlink of note.backlinks) {
            if (!included.has(backlink)) {
              queue.push({ path: backlink, depth: current.depth + 1 });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Build graph data structure
   */
  private buildGraphData(notes: Note[]) {
    const nodes = notes.map(note => ({
      id: note.path,
      label: note.name,
      tags: note.tags,
      linkCount: note.links.length,
      backlinks: note.backlinks?.length || 0,
    }));

    const edges: Array<{ source: string; target: string }> = [];

    for (const note of notes) {
      for (const link of note.links) {
        // Find the target note
        const target = notes.find(n => 
          n.path === link || 
          n.path === `${link}.md` ||
          n.name === link
        );

        if (target) {
          edges.push({
            source: note.path,
            target: target.path,
          });
        }
      }
    }

    return { nodes, edges };
  }

  /**
   * Generate Mermaid graph syntax
   */
  private generateMermaidGraph(graphData: { nodes: any[]; edges: any[] }): string {
    const lines: string[] = [];
    lines.push('```mermaid');
    lines.push('graph TB');
    lines.push('');

    // Node definitions with sanitized IDs
    const nodeIdMap = new Map<string, string>();
    graphData.nodes.forEach((node, index) => {
      const nodeId = `N${index}`;
      nodeIdMap.set(node.id, nodeId);
      const label = node.label.replace(/"/g, "'");
      lines.push(`    ${nodeId}["${label}"]`);
    });

    lines.push('');

    // Edges
    const addedEdges = new Set<string>();
    graphData.edges.forEach(edge => {
      const sourceId = nodeIdMap.get(edge.source);
      const targetId = nodeIdMap.get(edge.target);
      if (sourceId && targetId) {
        const edgeKey = `${sourceId}-${targetId}`;
        const reverseKey = `${targetId}-${sourceId}`;
        
        // Use bidirectional arrow if both directions exist
        if (!addedEdges.has(edgeKey) && !addedEdges.has(reverseKey)) {
          const hasBidirectional = graphData.edges.some(
            e => nodeIdMap.get(e.source) === targetId && nodeIdMap.get(e.target) === sourceId
          );
          
          if (hasBidirectional) {
            lines.push(`    ${sourceId} <--> ${targetId}`);
            addedEdges.add(edgeKey);
            addedEdges.add(reverseKey);
          } else {
            lines.push(`    ${sourceId} --> ${targetId}`);
            addedEdges.add(edgeKey);
          }
        }
      }
    });

    lines.push('');

    // Simple uniform styling like Obsidian
    lines.push('    classDef default fill:#483D8B,stroke:#2E2870,stroke-width:2px,color:#fff');

    lines.push('```');
    lines.push('');
    lines.push(`**Graph Stats:** ${graphData.nodes.length} notes, ${graphData.edges.length} links`);

    return lines.join('\n');
  }
}
