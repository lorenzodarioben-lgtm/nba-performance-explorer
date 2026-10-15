import { parse, type DefaultTreeAdapterMap } from 'parse5';
import { ArchiveSourceError } from './wiki-client.js';
export type HtmlNode = DefaultTreeAdapterMap['node'];
export type HtmlElement = DefaultTreeAdapterMap['element'];
export const isElement = (n: HtmlNode): n is HtmlElement => 'tagName' in n;
export const children = (n: HtmlNode): HtmlNode[] =>
  'childNodes' in n ? n.childNodes : [];
export const attribute = (n: HtmlNode, name: string) =>
  isElement(n) ? n.attrs.find((a) => a.name === name)?.value : undefined;
export function walk(root: HtmlNode): HtmlNode[] {
  const nodes: HtmlNode[] = [],
    stack = [root];
  while (stack.length) {
    const n = stack.pop()!;
    nodes.push(n);
    if (nodes.length > 150_000) throw new ArchiveSourceError('invalid');
    stack.push(...children(n).slice().reverse());
  }
  return nodes;
}
export function text(root: HtmlNode): string {
  const parts: string[] = [],
    stack = [root];
  while (stack.length) {
    const n = stack.pop()!;
    if (isElement(n) && ['sup', 'style', 'script'].includes(n.tagName)) continue;
    if (n.nodeName === '#text' && 'value' in n) parts.push(n.value);
    else if (isElement(n) && n.tagName === 'br') parts.push(' ');
    else stack.push(...children(n).slice().reverse());
  }
  return parts.join('').replace(/\s+/g, ' ').trim();
}
export function parsePage(html: string) {
  if (html.length > 2_000_000) throw new ArchiveSourceError('invalid');
  return walk(parse(html));
}
export function directRows(table: HtmlElement): HtmlElement[][] {
  return walk(table)
    .filter((n): n is HtmlElement => {
      if (!isElement(n) || n.tagName !== 'tr') return false;
      let parent = n.parentNode;
      while (parent && parent !== table) {
        if (isElement(parent) && parent.tagName === 'table') return false;
        parent = 'parentNode' in parent ? parent.parentNode : null;
      }
      return true;
    })
    .map((row) =>
      children(row).filter(
        (n): n is HtmlElement => isElement(n) && ['th', 'td'].includes(n.tagName),
      ),
    );
}
export function expandedRows(table: HtmlElement) {
  const pending = new Map<number, { cell: HtmlElement; left: number }>();
  return directRows(table).map((cells) => {
    const result: HtmlElement[] = [];
    let index = 0;
    const occupied = () => {
      while (pending.has(index)) {
        const p = pending.get(index)!;
        result[index] = p.cell;
        if (--p.left === 0) pending.delete(index);
        index++;
      }
    };
    for (const cell of cells) {
      occupied();
      const columns = Number(attribute(cell, 'colspan') ?? 1),
        rows = Number(attribute(cell, 'rowspan') ?? 1);
      if (
        !Number.isInteger(columns) ||
        columns < 1 ||
        columns > 30 ||
        !Number.isInteger(rows) ||
        rows < 1 ||
        rows > 100
      )
        throw new ArchiveSourceError('invalid');
      for (let i = 0; i < columns; i++) {
        result[index] = cell;
        if (rows > 1) pending.set(index, { cell, left: rows - 1 });
        index++;
      }
    }
    occupied();
    return result;
  });
}
/** The article title an internal Wikipedia link points to, in any form the parse API emits. */
function articleTitle(element: HtmlElement): string | null {
  const href = attribute(element, 'href');
  if (!href) return null;
  // Legacy parser output: "/wiki/Title" (percent-encoded). Parsoid output (2026): absolute
  // "https://en.wikipedia.org/wiki/Title" or "./Title" with rel="mw:WikiLink", unencoded.
  const raw =
    /^\/wiki\/(.+)$/.exec(href)?.[1] ??
    /^https:\/\/en\.wikipedia\.org\/wiki\/(.+)$/.exec(href)?.[1] ??
    (attribute(element, 'rel')?.split(/\s+/).includes('mw:WikiLink')
      ? /^\.\/(.+)$/.exec(href)?.[1]
      : undefined);
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

/**
 * The first internal article link in a cell, as a canonical URL in MediaWiki's own encoding
 * (non-ASCII and apostrophes percent-encoded; parentheses and commas literal), so links read
 * from either parser output compare equal to identities stored from earlier snapshots.
 * Namespaced pages (File:, Category:), fragments and queries are not article links.
 */
export function wikiLink(cell: HtmlNode): string | null {
  for (const n of walk(cell)) {
    if (!isElement(n) || n.tagName !== 'a') continue;
    const title = articleTitle(n);
    if (title === null) continue;
    // Same rule as the legacy pattern: no namespaces, fragments, queries or subpages.
    if (/[:#?/]/.test(title)) return null;
    const encoded = encodeURIComponent(title)
      .replace(/'/g, '%27')
      .replace(/%2C/g, ',')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')');
    if (!/^[\w%()',.-]+$/.test(encoded)) return null;
    return `https://en.wikipedia.org/wiki/${encoded}`;
  }
  return null;
}
