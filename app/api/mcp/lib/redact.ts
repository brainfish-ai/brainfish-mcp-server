const SENSITIVE_KEYS = new Set([
  'text',
  'content',
  'query',
  'title',
  'reason',
  'files',
]);

export function redactSensitiveArgs(
  args: Record<string, unknown>,
): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (SENSITIVE_KEYS.has(key)) {
      safe[key] =
        typeof value === 'string'
          ? `[redacted, ${value.length} chars]`
          : Array.isArray(value)
            ? `[redacted, ${value.length} items]`
            : '[redacted]';
    } else {
      safe[key] = value;
    }
  }
  return safe;
}
