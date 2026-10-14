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
export function wikiLink(cell: HtmlNode): string | null {
  const href = walk(cell).find(
    (n) =>
      isElement(n) && n.tagName === 'a' && attribute(n, 'href')?.startsWith('/wiki/'),
  );
  const value = href && attribute(href, 'href');
  if (!value || !/^\/wiki\/[\w%()',.-]+$/.test(value)) return null;
  return `https://en.wikipedia.org${value}`;
}
