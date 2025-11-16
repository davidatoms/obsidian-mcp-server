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
    } else if (input.format === 'ascii') {
      return this.generateAsciiGraph(graphData);
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

  /**
   * Generate ASCII terminal graph visualization
   */
  private generateAsciiGraph(graphData: { nodes: any[]; edges: any[] }): string {
    const width = 120;
    const height = 40;
    
    // Simple force-directed layout simulation
    interface NodePosition {
      id: string;
      label: string;
      x: number;
      y: number;
      vx: number;
      vy: number;
      connections: number;
    }

    const positions: NodePosition[] = graphData.nodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / graphData.nodes.length;
      const radius = Math.min(width, height) * 0.3;
      return {
        id: node.id,
        label: node.label.slice(0, 15), // Truncate long names
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        vx: 0,
        vy: 0,
        connections: node.linkCount + node.backlinks,
      };
    });

    // Run simple force simulation
    for (let iter = 0; iter < 50; iter++) {
      // Repulsion between all nodes
      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 100 / (dist * dist);
          
          positions[i].vx -= (dx / dist) * force;
          positions[i].vy -= (dy / dist) * force;
          positions[j].vx += (dx / dist) * force;
          positions[j].vy += (dy / dist) * force;
        }
      }

      // Attraction along edges
      for (const edge of graphData.edges) {
        const source = positions.find(p => p.id === edge.source);
        const target = positions.find(p => p.id === edge.target);
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = dist * 0.01;
          
          source.vx += (dx / dist) * force;
          source.vy += (dy / dist) * force;
          target.vx -= (dx / dist) * force;
          target.vy -= (dy / dist) * force;
        }
      }

      // Update positions with damping
      for (const pos of positions) {
        pos.x += pos.vx;
        pos.y += pos.vy;
        pos.vx *= 0.8;
        pos.vy *= 0.8;
        
        // Keep within bounds
        pos.x = Math.max(5, Math.min(width - 5, pos.x));
        pos.y = Math.max(2, Math.min(height - 2, pos.y));
      }
    }

    // Create canvas
    const canvas: string[][] = [];
    for (let y = 0; y < height; y++) {
      canvas[y] = [];
      for (let x = 0; x < width; x++) {
        canvas[y][x] = ' ';
      }
    }

    // Draw edges first
    for (const edge of graphData.edges) {
      const source = positions.find(p => p.id === edge.source);
      const target = positions.find(p => p.id === edge.target);
      if (source && target) {
        this.drawLine(canvas, source.x, source.y, target.x, target.y, '·');
      }
    }

    // Draw nodes
    for (const pos of positions) {
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      
      if (y >= 0 && y < height && x >= 0 && x < width) {
        // Draw node symbol based on connections
        const symbol = pos.connections >= 5 ? '◉' : pos.connections > 0 ? '●' : '○';
        canvas[y][x] = symbol;
        
        // Try to place label near node
        const labelX = Math.min(width - pos.label.length - 1, x + 2);
        if (labelX >= 0 && y < height) {
          for (let i = 0; i < pos.label.length && labelX + i < width; i++) {
            if (canvas[y][labelX + i] === ' ' || canvas[y][labelX + i] === '·') {
              canvas[y][labelX + i] = pos.label[i];
            }
          }
        }
      }
    }

    // Convert canvas to string
    const lines: string[] = [];
    lines.push('┌' + '─'.repeat(width - 2) + '┐');
    for (const row of canvas) {
      lines.push('│' + row.join('') + '│');
    }
    lines.push('└' + '─'.repeat(width - 2) + '┘');
    lines.push('');
    lines.push('Legend: ◉ Hub (5+ connections)  ● Normal (1-4)  ○ Orphan (0)  · Connection');
    lines.push(`Nodes: ${graphData.nodes.length}  Edges: ${graphData.edges.length}`);

    return lines.join('\n');
  }

  /**
   * Draw a line using Bresenham's algorithm
   */
  private drawLine(
    canvas: string[][],
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    char: string
  ): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (y0 >= 0 && y0 < canvas.length && x0 >= 0 && x0 < canvas[0].length) {
        if (canvas[y0][x0] === ' ') {
          canvas[y0][x0] = char;
        }
      }

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}
