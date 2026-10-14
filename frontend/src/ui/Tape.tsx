import type { DataProvenance } from '@nba-performance-explorer/contracts';

// Source tapes: the platform's source vocabulary. Every data module names the tape it was cut
// from, so a reader always knows whether a number was queried, archived, partial, calculated,
// hypothetical, unlinked or demonstration data.
export type TapeVariant =
  | 'archive'
  | 'queried'
  | 'partial'
  | 'derived'
  | 'hypothetical'
  | 'unlinked'
  | 'demo';

export interface TapeSpec {
  code: string;
  source?: string;
  variant: TapeVariant;
}

const DESCRIPTIONS: Record<TapeVariant, string> = {
  archive: 'Archived record',
  queried: 'Queried on request, not live',
  partial: 'Partial record',
  derived: 'Calculated by the app',
  hypothetical: 'Hypothetical, never observed',
  unlinked: 'Present, not linked',
  demo: 'Demonstration data, not real NBA results',
};

export function Tape({ code, source, variant }: TapeSpec) {
  const flag =
    variant === 'partial'
      ? 'Partial'
      : variant === 'hypothetical'
        ? 'Hypothetical'
        : null;
  const base = variant === 'partial' ? 'archive' : variant;
  return (
    <span
      className={`tape tape--${base}`}
      title={`${DESCRIPTIONS[variant]}${source ? ` · ${source}` : ''}`}
    >
      <span className="tape__code">
        {variant === 'derived' ? 'ƒ ' : ''}
        {code}
      </span>
      {source ? <span className="tape__src">{source}</span> : null}
      {flag ? (
        <span className={`tape__flag tape__flag--${variant}`}>{flag}</span>
      ) : null}
    </span>
  );
}

/** Map a provenance record from the API to its tape. */
export function tapeForProvenance(provenance: DataProvenance): TapeSpec {
  switch (provenance.source) {
    case 'fixture':
      return { code: 'Demo', source: 'Fixtures', variant: 'demo' };
    case 'nba-stats':
      return { code: 'NBA.com', source: 'Queried', variant: 'queried' };
    case 'wikipedia':
      return { code: 'Archive', source: 'Wikipedia · CC BY-SA', variant: 'archive' };
    case 'wikidata':
      return { code: 'WD', source: 'Wikidata · CC0', variant: 'archive' };
    case 'kaggle-cc0':
      return { code: '18 PO', source: 'Kaggle · CC0', variant: 'partial' };
    case 'open-research':
      return { code: '17–18', source: 'Dataverse · Etalab 2.0', variant: 'archive' };
    case 'nba-api-static':
      return { code: 'IDs', source: 'nba_api static · MIT', variant: 'archive' };
    default:
      return { code: 'Source', source: 'Unknown', variant: 'archive' };
  }
}
