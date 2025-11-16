import { describe, it, expect } from 'vitest';
import {
  GetNoteSchema,
  CreateNoteSchema,
  UpdateNoteSchema,
  DeleteNoteSchema,
  ListNotesSchema,
  SearchContentSchema,
  SearchTagsSchema,
  ListTagsSchema,
} from './validation.js';

describe('Validation Schemas', () => {
  describe('GetNoteSchema', () => {
    it('should validate with path', () => {
      const input = { path: 'folder/note.md', format: 'markdown' };
      const result = GetNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with title', () => {
      const input = { title: 'My Note', format: 'json' };
      const result = GetNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should use default format', () => {
      const input = { path: 'note.md' };
      const result = GetNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.format).toBe('markdown');
      }
    });
  });

  describe('CreateNoteSchema', () => {
    it('should validate minimal input', () => {
      const input = { path: 'note.md', content: 'Content' };
      const result = CreateNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with frontmatter', () => {
      const input = {
        path: 'note.md',
        content: 'Content',
        frontmatter: { tags: ['test'], status: 'draft' },
      };
      const result = CreateNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should use default createFolders', () => {
      const input = { path: 'note.md', content: 'Content' };
      const result = CreateNoteSchema.safeParse(input);
      if (result.success) {
        expect(result.data.createFolders).toBe(true);
      }
    });

    it('should require path and content', () => {
      const input = { path: 'note.md' };
      const result = CreateNoteSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateNoteSchema', () => {
    it('should validate update with content', () => {
      const input = { path: 'note.md', content: 'New content' };
      const result = UpdateNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate update with frontmatter only', () => {
      const input = { path: 'note.md', frontmatter: { status: 'done' } };
      const result = UpdateNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should use default append value', () => {
      const input = { path: 'note.md', content: 'Content' };
      const result = UpdateNoteSchema.safeParse(input);
      if (result.success) {
        expect(result.data.append).toBe(false);
      }
    });
  });

  describe('DeleteNoteSchema', () => {
    it('should validate with confirmation', () => {
      const input = { path: 'note.md', confirm: true };
      const result = DeleteNoteSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should use default confirmation', () => {
      const input = { path: 'note.md' };
      const result = DeleteNoteSchema.safeParse(input);
      if (result.success) {
        expect(result.data.confirm).toBe(false);
      }
    });
  });

  describe('ListNotesSchema', () => {
    it('should validate with defaults', () => {
      const input = {};
      const result = ListNotesSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should validate with folder filter', () => {
      const input = { folder: 'Research', limit: 10 };
      const result = ListNotesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with tag filter', () => {
      const input = { tag: 'important' };
      const result = ListNotesSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject invalid limit', () => {
      const input = { limit: -1 };
      const result = ListNotesSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchContentSchema', () => {
    it('should validate search query', () => {
      const input = { query: 'search term' };
      const result = SearchContentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should validate with options', () => {
      const input = {
        query: 'term',
        folder: 'Notes',
        caseSensitive: true,
        limit: 20,
      };
      const result = SearchContentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should use default values', () => {
      const input = { query: 'term' };
      const result = SearchContentSchema.safeParse(input);
      if (result.success) {
        expect(result.data.caseSensitive).toBe(false);
        expect(result.data.limit).toBe(50);
      }
    });

    it('should require query', () => {
      const input = {};
      const result = SearchContentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('SearchTagsSchema', () => {
    it('should validate tag search', () => {
      const input = { tag: 'important' };
      const result = SearchTagsSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should require tag', () => {
      const input = {};
      const result = SearchTagsSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('ListTagsSchema', () => {
    it('should validate with defaults', () => {
      const input = {};
      const result = ListTagsSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sortBy).toBe('name');
      }
    });

    it('should validate sort options', () => {
      const countSort = ListTagsSchema.safeParse({ sortBy: 'count' });
      const nameSort = ListTagsSchema.safeParse({ sortBy: 'name' });
      expect(countSort.success).toBe(true);
      expect(nameSort.success).toBe(true);
    });
  });
});
