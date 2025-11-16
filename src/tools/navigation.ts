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
    } else if (input.format === 'html') {
      return this.generateD3Graph(graphData);
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

  /**
   * Generate interactive D3.js force-directed graph
   */
  private generateD3Graph(graphData: { nodes: any[]; edges: any[] }): string {
    const graphJson = JSON.stringify({
      nodes: graphData.nodes.map(n => ({
        id: n.id,
        label: n.label,
        connections: n.linkCount + n.backlinks,
      })),
      links: graphData.edges.map(e => ({
        source: e.source,
        target: e.target,
      })),
    });

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Obsidian Knowledge Graph</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #1e1e1e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      overflow: hidden;
    }
    #graph {
      width: 100vw;
      height: 100vh;
    }
    .node {
      cursor: pointer;
      transition: all 0.3s;
    }
    .node:hover {
      stroke: #fff;
      stroke-width: 3px;
    }
    .link {
      stroke: #999;
      stroke-opacity: 0.6;
      stroke-width: 1.5px;
    }
    .label {
      font-size: 12px;
      fill: #fff;
      pointer-events: none;
      text-anchor: middle;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    }
    .controls {
      position: fixed;
      top: 20px;
      left: 20px;
      background: rgba(30, 30, 30, 0.9);
      padding: 15px;
      border-radius: 8px;
      color: #fff;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    .controls h3 {
      margin: 0 0 10px 0;
      font-size: 16px;
    }
    .stats {
      position: fixed;
      bottom: 20px;
      left: 20px;
      background: rgba(30, 30, 30, 0.9);
      padding: 15px;
      border-radius: 8px;
      color: #fff;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="graph"></div>
  <div class="controls">
    <h3>Obsidian Knowledge Graph</h3>
    <div>◉ Hub (5+ links) | ● Normal (1-4) | ○ Orphan (0)</div>
  </div>
  <div class="stats">
    <div>Nodes: <span id="node-count"></span></div>
    <div>Links: <span id="link-count"></span></div>
  </div>

  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script>
    const data = ${graphJson};
    
    // Set up dimensions
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Create SVG
    const svg = d3.select('#graph')
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create a group for zoom/pan
    const g = svg.append('g');

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    
    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links)
        .id(d => d.id)
        .distance(100))
      .force('charge', d3.forceManyBody()
        .strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(30));

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(data.links)
      .join('line')
      .attr('class', 'link');

    // Create nodes
    const node = g.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .join('circle')
      .attr('class', 'node')
      .attr('r', d => {
        if (d.connections >= 5) return 12;
        if (d.connections > 0) return 8;
        return 6;
      })
      .attr('fill', d => {
        if (d.connections >= 5) return '#5B9BD5';
        if (d.connections > 0) return '#70AD47';
        return '#FFA500';
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Add labels
    const label = g.append('g')
      .selectAll('text')
      .data(data.nodes)
      .join('text')
      .attr('class', 'label')
      .attr('dy', -15)
      .text(d => d.label);

    // Add tooltips
    node.append('title')
      .text(d => \`\${d.label}\\nConnections: \${d.connections}\`);

    // Update positions on each tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      label
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Drag functions
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Update stats
    document.getElementById('node-count').textContent = data.nodes.length;
    document.getElementById('link-count').textContent = data.links.length;

    // Initial zoom to fit
    setTimeout(() => {
      const bounds = g.node().getBBox();
      const fullWidth = bounds.width;
      const fullHeight = bounds.height;
      const midX = bounds.x + fullWidth / 2;
      const midY = bounds.y + fullHeight / 2;
      const scale = 0.8 / Math.max(fullWidth / width, fullHeight / height);
      const translate = [width / 2 - scale * midX, height / 2 - scale * midY];
      
      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
    }, 100);
  </script>
</body>
</html>`;
  }
}
