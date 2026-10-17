import type { WikiAttribution as Attribution } from '@nba-performance-explorer/contracts';
export function WikiAttribution({ data }: { data: Attribution }) {
  return (
    <p>
      Adapted tables from{' '}
      <a href={data.url} target="_blank" rel="noreferrer">
        {data.title}, revision {data.revision}
      </a>
      , by{' '}
      <a
        href={`https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(data.title)}&action=history`}
        target="_blank"
        rel="noreferrer"
      >
        Wikipedia contributors
      </a>
      . Snapshot data is available under{' '}
      <a href={data.licenseUrl} target="_blank" rel="noreferrer">
        {data.license}
      </a>
      . No article prose or images are reproduced.
    </p>
  );
}
