import { marked } from 'marked';

// Configure marked to handle custom rendering safely
marked.setOptions({
  breaks: true,
  gfm: true,
});

export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  try {
    return marked.parse(markdown) as string;
  } catch (e) {
    console.error('Failed to parse markdown', e);
    return markdown.replace(/\n/g, '<br />');
  }
}
