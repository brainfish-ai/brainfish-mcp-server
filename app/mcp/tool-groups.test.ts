import { describe, expect, it } from 'vitest';
import { TOOLS } from '../api/mcp/lib/tools';
import { MCP_TOOL_GROUPS, toolLabel } from './tool-groups';

describe('toolLabel', () => {
  it('strips brainfish_ prefix and replaces underscores with spaces', () => {
    expect(toolLabel('brainfish_search_documents')).toBe('search documents');
    expect(toolLabel('brainfish_validate_token')).toBe('validate token');
  });
});

describe('MCP_TOOL_GROUPS', () => {
  it('lists the same tool ids as TOOLS (no drift vs server)', () => {
    const fromGroups = MCP_TOOL_GROUPS.flatMap((g) => g.tools).sort();
    const fromTools = Object.keys(TOOLS).sort();
    expect(fromGroups).toEqual(fromTools);
  });

  it('has one entry per category name', () => {
    const names = MCP_TOOL_GROUPS.map((g) => g.name);
    expect(new Set(names).size).toBe(names.length);
  });
});
