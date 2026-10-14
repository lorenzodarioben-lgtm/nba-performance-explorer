import { motion } from 'motion/react';
import { useState } from 'react';
import type { ResearchBookmark } from '@nba-performance-explorer/contracts';

import { springs } from '../../motion/tokens';
import { Icon } from '../../ui/Icon';
import { useToast } from '../../ui/Toast';
import { researchRepository } from './local-research';

export function SaveResearchButton({
  kind,
  label,
  path,
}: Pick<ResearchBookmark, 'kind' | 'label' | 'path'>) {
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(false);
  const toast = useToast();
  return (
    <div className="save-research">
      <button
        type="button"
        className="btn btn--sm"
        data-saved={saved || undefined}
        onClick={() => {
          try {
            const result = researchRepository.add({
              kind,
              label,
              path,
              createdAt: new Date().toISOString(),
            });
            setMessage(result.warning ?? 'Saved in My NBA on this device.');
            setSaved(true);
            if (!result.warning) toast('Saved to My NBA');
          } catch {
            setMessage('Could not save: limit reached or invalid internal link.');
          }
        }}
      >
        <motion.span
          key={saved ? 'on' : 'off'}
          initial={saved ? { scale: 0.4, rotate: -30 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={springs.feedback}
          style={{ display: 'inline-flex' }}
        >
          <Icon name="star" size={15} filled={saved} />
        </motion.span>
        Save to My NBA
      </button>
      {message && (
        <p role="status" className="save-research__msg">
          {message}
        </p>
      )}
    </div>
  );
}
