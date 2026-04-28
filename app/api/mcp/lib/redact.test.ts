import { describe, expect, it } from 'vitest';
import { redactSensitiveArgs } from './redact';

describe('redactSensitiveArgs', () => {
  it('passes through keys that are not sensitive', () => {
    expect(
      redactSensitiveArgs({ limit: 10, collectionId: 'uuid-here' }),
    ).toEqual({ limit: 10, collectionId: 'uuid-here' });
  });

  it('redacts string values for sensitive keys with length hint', () => {
    expect(redactSensitiveArgs({ query: 'secret search' })).toEqual({
      query: '[redacted, 13 chars]',
    });
  });

  it('redacts array values for sensitive keys with item count', () => {
    expect(redactSensitiveArgs({ files: ['a', 'b'] })).toEqual({
      files: '[redacted, 2 items]',
    });
  });

  it('redacts non-string non-array sensitive values as generic redacted', () => {
    expect(redactSensitiveArgs({ title: null })).toEqual({
      title: '[redacted]',
    });
  });

  it('redacts text, content, title, reason consistently with query', () => {
    const out = redactSensitiveArgs({
      text: 'x',
      content: 'y',
      title: 'z',
      reason: 'r',
    });
    expect(out.text).toMatch(/^\[redacted/);
    expect(out.content).toMatch(/^\[redacted/);
    expect(out.title).toMatch(/^\[redacted/);
    expect(out.reason).toMatch(/^\[redacted/);
  });
});
