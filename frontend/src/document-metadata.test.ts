import { describe, expect, it } from 'vitest';

// Read the committed files through Vite's `?raw` loader so they resolve relative to this test file
// (via the bundler), not the process working directory — reliable under `npm run validate` and any
// other invocation. Deterministic, offline, no DOM tooling.
import faviconSvg from '../public/favicon.svg?raw';
import indexHtml from '../index.html?raw';

describe('document metadata', () => {
  it('has a descriptive product title', () => {
    expect(indexHtml).toMatch(/<title>NBA Performance Explorer/);
  });

  it('has a meta description and no development-foundation wording', () => {
    expect(indexHtml).toContain('name="description"');
    expect(indexHtml).not.toContain('Development foundation');
  });

  it('declares a theme colour and a favicon', () => {
    expect(indexHtml).toContain('name="theme-color"');
    expect(indexHtml).toContain('rel="icon"');
    expect(indexHtml).toContain('/favicon.svg');
  });

  it('declares Open Graph and Twitter card metadata with the production URL', () => {
    expect(indexHtml).toContain('property="og:type"');
    expect(indexHtml).toContain('property="og:title"');
    expect(indexHtml).toContain('property="og:description"');
    expect(indexHtml).toContain('property="og:url"');
    expect(indexHtml).toContain('https://nba-performance-explorer.onrender.com');
    expect(indexHtml).toContain('name="twitter:card"');
    expect(indexHtml).toContain('name="twitter:title"');
    expect(indexHtml).toContain('name="twitter:description"');
  });

  it('declares a 1200 x 630 social preview at the production URL, never a local host', () => {
    const meta = (attr: string, key: string) =>
      new RegExp(`<meta\\s+${attr}="${key}"\\s+content="([^"]+)"`).exec(indexHtml)?.[1];
    const image = meta('property', 'og:image');
    expect(image).toBe('https://nba-performance-explorer.onrender.com/og-image.jpg');
    expect(meta('property', 'og:image:width')).toBe('1200');
    expect(meta('property', 'og:image:height')).toBe('630');
    expect(meta('property', 'og:image:alt')?.length).toBeGreaterThan(20);
    expect(meta('name', 'twitter:card')).toBe('summary_large_image');
    expect(meta('name', 'twitter:image')).toBe(image);
    expect(indexHtml).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it('declares app icons derived from the site mark', () => {
    expect(indexHtml).toContain(
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
    );
    expect(indexHtml).toContain('<link rel="manifest" href="/site.webmanifest" />');
  });
});

describe('favicon', () => {
  it('exists, is an SVG, and contains no scripts or external references', () => {
    expect(faviconSvg).toContain('<svg');
    // No script execution and no external/embedded resource fetches (the standard `xmlns` namespace
    // URI is a declaration, not a network request, so it is intentionally allowed).
    expect(faviconSvg).not.toContain('<script');
    expect(faviconSvg).not.toContain('<image');
    expect(faviconSvg).not.toMatch(/\bhref=/i);
    expect(faviconSvg).not.toMatch(/\bsrc=/i);
    expect(faviconSvg).not.toMatch(/url\(/i);
  });
});
