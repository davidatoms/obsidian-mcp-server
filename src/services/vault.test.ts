import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { VaultService } from './vault.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

describe('VaultService', () => {
  let vaultPath: string;
  let vault: VaultService;

  beforeEach(async () => {
    // Create temporary test vault
    vaultPath = path.join(tmpdir(), `test-vault-${Date.now()}`);
    await fs.mkdir(vaultPath, { recursive: true });
    vault = new VaultService(vaultPath);
  });

  afterEach(async () => {
    // Cleanup test vault
    try {
      await fs.rm(vaultPath, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('validateVault', () => {
    it('should validate existing vault directory', async () => {
      await expect(vault.validateVault()).resolves.toBeUndefined();
    });

    it('should throw error for non-existent vault', async () => {
      const invalidVault = new VaultService('/nonexistent/path');
      await expect(invalidVault.validateVault()).rejects.toThrow();
    });
  });

  describe('path operations', () => {
    it('should convert relative to absolute path', () => {
      const relativePath = 'folder/note.md';
      const absolutePath = vault.getAbsolutePath(relativePath);
      expect(absolutePath).toBe(path.join(vaultPath, relativePath));
    });

    it('should handle leading slash in relative path', () => {
      const relativePath = '/folder/note.md';
      const absolutePath = vault.getAbsolutePath(relativePath);
      expect(absolutePath).toBe(path.join(vaultPath, 'folder/note.md'));
    });

    it('should convert absolute to relative path', () => {
      const absolutePath = path.join(vaultPath, 'folder/note.md');
      const relativePath = vault.getRelativePath(absolutePath);
      expect(relativePath).toBe(path.normalize('folder/note.md'));
    });
  });

  describe('isMarkdownFile', () => {
    it('should identify markdown files', () => {
      expect(vault.isMarkdownFile('note.md')).toBe(true);
      expect(vault.isMarkdownFile('note.markdown')).toBe(true);
      expect(vault.isMarkdownFile('NOTE.MD')).toBe(true);
    });

    it('should reject non-markdown files', () => {
      expect(vault.isMarkdownFile('image.png')).toBe(false);
      expect(vault.isMarkdownFile('doc.pdf')).toBe(false);
      expect(vault.isMarkdownFile('noextension')).toBe(false);
    });
  });

  describe('extractTags', () => {
    it('should extract inline tags', () => {
      const content = 'This is #tag1 and #tag2/subtag content';
      const tags = vault.extractTags(content);
      expect(tags).toContain('tag1');
      expect(tags).toContain('tag2/subtag');
    });

    it('should extract frontmatter tags', () => {
      const content = 'Some content';
      const frontmatterTags = ['tag1', '#tag2'];
      const tags = vault.extractTags(content, frontmatterTags);
      expect(tags).toContain('tag1');
      expect(tags).toContain('tag2');
    });

    it('should combine inline and frontmatter tags', () => {
      const content = 'Content with #inline-tag';
      const frontmatterTags = ['frontmatter-tag'];
      const tags = vault.extractTags(content, frontmatterTags);
      expect(tags).toContain('inline-tag');
      expect(tags).toContain('frontmatter-tag');
    });

    it('should deduplicate tags', () => {
      const content = '#duplicate #duplicate';
      const tags = vault.extractTags(content);
      expect(tags.filter(t => t === 'duplicate')).toHaveLength(1);
    });
  });

  describe('extractLinks', () => {
    it('should extract wiki-style links', () => {
      const content = '[[Link1]] and [[Link2|Display Text]]';
      const links = vault.extractLinks(content);
      expect(links).toHaveLength(2);
      expect(links[0].target).toBe('Link1');
      expect(links[1].target).toBe('Link2');
      expect(links[1].displayText).toBe('Display Text');
    });

    it('should extract links with headings', () => {
      const content = '[[Note#Heading]]';
      const links = vault.extractLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('Note');
      expect(links[0].heading).toBe('Heading');
    });

    it('should extract embeds', () => {
      const content = '![[Embedded Note]]';
      const links = vault.extractLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].isEmbed).toBe(true);
    });

    it('should extract markdown links', () => {
      const content = '[Link Text](path/to/note.md)';
      const links = vault.extractLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('path/to/note.md');
      expect(links[0].displayText).toBe('Link Text');
    });

    it('should ignore external URLs', () => {
      const content = '[External](https://example.com) and [[Internal]]';
      const links = vault.extractLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].target).toBe('Internal');
    });
  });

  describe('extractHeadings', () => {
    it('should extract headings with levels', () => {
      const content = '# Level 1\n## Level 2\n### Level 3';
      const headings = vault.extractHeadings(content);
      expect(headings).toHaveLength(3);
      expect(headings[0]).toEqual({ text: 'Level 1', level: 1, line: 1 });
      expect(headings[1]).toEqual({ text: 'Level 2', level: 2, line: 2 });
      expect(headings[2]).toEqual({ text: 'Level 3', level: 3, line: 3 });
    });

    it('should ignore non-heading lines', () => {
      const content = 'Normal text\n# Heading\nMore text';
      const headings = vault.extractHeadings(content);
      expect(headings).toHaveLength(1);
      expect(headings[0].text).toBe('Heading');
    });
  });

  describe('note operations', () => {
    it('should create and read a note', async () => {
      const notePath = 'test-note.md';
      const content = '# Test Note\n\nSome content';
      
      await vault.createNote(notePath, content);
      const note = await vault.readNote(notePath);
      
      expect(note).toBeDefined();
      expect(note.content).toBe(content);
      expect(note.name).toBe('test-note');
    });

    it('should create note with frontmatter', async () => {
      const notePath = 'test-note.md';
      const content = 'Content here';
      const frontmatter = { tags: ['test'], status: 'draft' };
      
      await vault.createNote(notePath, content, frontmatter);
      const note = await vault.readNote(notePath);
      
      expect(note.frontmatter).toEqual(frontmatter);
    });

    it('should update note content', async () => {
      const notePath = 'test-note.md';
      await vault.createNote(notePath, 'Original content');
      
      await vault.updateNote(notePath, 'Updated content');
      const note = await vault.readNote(notePath);
      
      expect(note.content).toBe('Updated content');
    });

    it('should append to note content', async () => {
      const notePath = 'test-note.md';
      await vault.createNote(notePath, 'Original');
      
      await vault.updateNote(notePath, '\\nAppended', undefined, true);
      const note = await vault.readNote(notePath);
      
      expect(note.content).toBe('Original\\nAppended');
    });

    it('should delete a note', async () => {
      const notePath = 'test-note.md';
      await vault.createNote(notePath, 'Content');
      
      await vault.deleteNote(notePath);
      
      await expect(vault.readNote(notePath)).rejects.toThrow();
    });
  });

  describe('findNoteByTitle', () => {
    beforeEach(async () => {
      await vault.createNote('exact-match.md', 'Content 1');
      await vault.createNote('similar-name.md', 'Content 2');
      await vault.createNote('folder/nested-note.md', 'Content 3');
    });

    it('should find note by exact title', async () => {
      const note = await vault.findNoteByTitle('exact-match');
      expect(note).toBeDefined();
      expect(note?.name).toBe('exact-match');
    });

    it('should handle case-insensitive search', async () => {
      const note = await vault.findNoteByTitle('EXACT-MATCH');
      expect(note).toBeDefined();
    });

    it('should return null for non-existent note', async () => {
      const note = await vault.findNoteByTitle('nonexistent');
      expect(note).toBeNull();
    });
  });

  describe('getAllNotes', () => {
    beforeEach(async () => {
      await fs.mkdir(path.join(vaultPath, 'folder1'), { recursive: true });
      await fs.mkdir(path.join(vaultPath, 'folder2'), { recursive: true });
      
      await vault.createNote('note1.md', 'Content 1');
      await vault.createNote('folder1/note2.md', 'Content 2');
      await vault.createNote('folder2/note3.md', 'Content 3');
    });

    it('should get all notes in vault', async () => {
      const notes = await vault.getAllNotes();
      expect(notes.length).toBeGreaterThanOrEqual(3);
    });

    it('should filter notes by folder', async () => {
      const notes = await vault.getAllNotes('folder1');
      expect(notes.length).toBe(1);
      expect(notes[0].name).toBe('note2');
    });
  });
});
