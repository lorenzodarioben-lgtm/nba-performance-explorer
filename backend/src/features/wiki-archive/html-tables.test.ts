import { describe, expect, it } from 'vitest';

import { parsePage, wikiLink } from './html-tables.js';

const cell = (html: string) =>
  parsePage(`<table><tr><td>${html}</td></tr></table>`)[0]!;

describe('wikiLink across Wikipedia parser outputs', () => {
  it('reads legacy, absolute and Parsoid-relative links into one canonical form', () => {
    const legacy = wikiLink(cell('<a href="/wiki/Luka_Don%C4%8Di%C4%87">Luka</a>'));
    const absolute = wikiLink(
      cell(
        '<a rel="mw:WikiLink" href="https://en.wikipedia.org/wiki/Luka_Dončić">Luka</a>',
      ),
    );
    const relative = wikiLink(
      cell('<a rel="mw:WikiLink" href="./Luka_Dončić">Luka</a>'),
    );
    expect(legacy).toBe('https://en.wikipedia.org/wiki/Luka_Don%C4%8Di%C4%87');
    expect(absolute).toBe(legacy);
    expect(relative).toBe(legacy);
    // Apostrophes encoded, parentheses and suffix dots literal, as MediaWiki writes them.
    expect(
      wikiLink(cell('<a href="https://en.wikipedia.org/wiki/De\'Andre_Hunter">x</a>')),
    ).toBe('https://en.wikipedia.org/wiki/De%27Andre_Hunter');
    expect(
      wikiLink(
        cell('<a href="https://en.wikipedia.org/wiki/AJ_Griffin_(basketball)">x</a>'),
      ),
    ).toBe('https://en.wikipedia.org/wiki/AJ_Griffin_(basketball)');
  });

  it('skips citation and external links but never accepts non-article pages', () => {
    expect(
      wikiLink(
        cell('<a href="#cite_note-1">[1]</a> <a href="/wiki/Naz_Reid">Naz Reid</a>'),
      ),
    ).toBe('https://en.wikipedia.org/wiki/Naz_Reid');
    expect(wikiLink(cell('<a href="https://www.nba.com/x">x</a>'))).toBeNull();
    expect(wikiLink(cell('<a href="./Naz_Reid">no rel</a>'))).toBeNull();
    for (const href of [
      'https://en.wikipedia.org/wiki/File:Logo.svg',
      '/wiki/Category:NBA',
      'https://en.wikipedia.org/wiki/Naz_Reid#Career',
      'https://en.wikipedia.org/wiki/A/B',
      'https://en.wikipedia.org/wiki/%E0%A4%A',
      'https://fr.wikipedia.org/wiki/Naz_Reid',
    ])
      expect(wikiLink(cell(`<a href="${href}">x</a>`)), href).toBeNull();
  });
});
