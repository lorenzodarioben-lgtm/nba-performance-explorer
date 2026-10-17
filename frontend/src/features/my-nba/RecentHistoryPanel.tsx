import { useState } from 'react';
import { Link } from 'react-router';
import { recentHistoryRepository } from './recent-history';
export function RecentHistoryPanel() {
  const [state, setState] = useState(() => recentHistoryRepository.load());
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <section>
      <h2>Recently viewed research</h2>
      <p>
        Optional and off by default. When enabled, the last 20 research page URLs and
        labels stay on this device. Original home, profile and compare screens are not
        recorded. No server analytics or cloud sync. Bookmark JSON exports do not
        include this separate recent-history store.
      </p>
      <label>
        <input
          type="checkbox"
          checked={state.data.enabled}
          onChange={(e) =>
            setState(recentHistoryRepository.setEnabled(e.target.checked))
          }
        />
        Record recently viewed research pages on this device
      </label>
      {state.warning && <p role="status">{state.warning}</p>}
      <p>
        {state.data.enabled
          ? 'Recording research visits locally.'
          : 'Recording is disabled. Existing visits can be cleared below.'}
      </p>
      {!state.data.visits.length ? (
        <p>No recorded research visits.</p>
      ) : (
        <ol>
          {state.data.visits.map((v) => (
            <li key={v.path}>
              <Link to={v.path}>{v.label}</Link> ·{' '}
              {new Date(v.visitedAt).toLocaleString()}
            </li>
          ))}
        </ol>
      )}
      {confirmClear ? (
        <div role="group" aria-label="Confirm clearing recent history">
          <p>Clear recorded research visits on this device?</p>
          <button
            onClick={() => {
              setState(recentHistoryRepository.clear());
              setConfirmClear(false);
            }}
          >
            Confirm clear recent history
          </button>
          <button onClick={() => setConfirmClear(false)}>
            Cancel clearing recent history
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirmClear(true)}>Clear recent history</button>
      )}
    </section>
  );
}
