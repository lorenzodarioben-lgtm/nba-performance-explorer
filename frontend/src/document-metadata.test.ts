import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// Deterministic check that the production document metadata reflects the finished product rather
// than the development foundation. Reads the committed index.html directly (no DOM/tooling). Vitest
// runs from the frontend workspace root, so index.html resolves against the current directory.
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('document metadata', () => {
  it('has a descriptive product title', () => {
    expect(html).toMatch(/<title>NBA Performance Explorer/);
  });

  it('has a meta description and no development-foundation wording', () => {
    expect(html).toContain('name="description"');
    expect(html).not.toContain('Development foundation');
  });

  it('declares a theme colour and a favicon', () => {
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('rel="icon"');
    expect(html).toContain('/favicon.svg');
  });

  it('declares Open Graph and Twitter card metadata with the production URL', () => {
    expect(html).toContain('property="og:type"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:url"');
    expect(html).toContain('https://nba-performance-explorer.onrender.com');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:title"');
    expect(html).toContain('name="twitter:description"');
  });

  it('does not reference an og:image (none committed yet)', () => {
    expect(html).not.toContain('og:image');
  });
});
