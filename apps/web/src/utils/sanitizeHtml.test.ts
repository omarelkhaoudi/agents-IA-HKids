import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes script tags from preview HTML', () => {
    const sanitized = sanitizeHtml('<p>Safe</p><script>alert("xss")</script>');
    expect(sanitized).toContain('Safe');
    expect(sanitized).not.toContain('<script');
  });

  it('returns fallback HTML when input is empty', () => {
    const sanitized = sanitizeHtml('');
    expect(sanitized).toContain('Generate a document draft');
  });
});
