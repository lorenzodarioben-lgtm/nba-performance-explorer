import { useState } from 'react';
import type { ResearchBookmark } from '@nba-performance-explorer/contracts';
import { researchRepository } from './local-research';

export function SaveResearchButton({
  kind,
  label,
  path,
}: Pick<ResearchBookmark, 'kind' | 'label' | 'path'>) {
  const [message, setMessage] = useState('');
  return (
    <>
      <button
        type="button"
        onClick={() => {
          try {
            const result = researchRepository.add({
              kind,
              label,
              path,
              createdAt: new Date().toISOString(),
            });
            setMessage(result.warning ?? 'Saved in My NBA on this device.');
          } catch {
            setMessage('Could not save: limit reached or invalid internal link.');
          }
        }}
      >
        Save to My NBA
      </button>
      {message && <p role="status">{message}</p>}
    </>
  );
}
