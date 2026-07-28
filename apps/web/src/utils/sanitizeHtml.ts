import DOMPurify from 'dompurify';

const DEFAULT_PREVIEW_HTML =
  '<div style="padding:32px;font-family:Arial,sans-serif;color:#334155;">Generate a document draft from an assistant response to review it here.</div>';

export function sanitizeHtml(html: string, fallbackHtml: string = DEFAULT_PREVIEW_HTML): string {
  if (!html || typeof html !== 'string') {
    return DOMPurify.sanitize(fallbackHtml);
  }

  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
  });
}
