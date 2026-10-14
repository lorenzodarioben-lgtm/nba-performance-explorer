import { useState } from 'react';
import { Link } from 'react-router';
import {
  MAX_RESEARCH_JSON_CHARS,
  type ResearchBookmark,
} from '@nba-performance-explorer/contracts';

import { ResearchShell } from '../research/ResearchShell';
import styles from '../research/research.module.css';
import { mergeResearch, parseResearchJson, researchRepository } from './local-research';
import { MotionSettingPanel } from './MotionSettingPanel';
import { RecentHistoryPanel } from './RecentHistoryPanel';
import { recentHistoryRepository } from './recent-history';

export function MyNbaPage() {
  const [store, setStore] = useState(() => researchRepository.load());
  const [message, setMessage] = useState('');
  const [importText, setImportText] = useState('');
  const [exportText, setExportText] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [recentReset, setRecentReset] = useState(0);
  return (
    <ResearchShell title="My NBA">
      <p>
        Favorites and named research links stay on this device. No accounts or cloud
        sync. Optional recent research history is off by default. Export your bookmark
        JSON before changing browsers or clearing storage.
      </p>
      <MotionSettingPanel />
      {store.warning && <p role="status">{store.warning}</p>}
      {message && <p role="status">{message}</p>}
      <h2>Save a favorite or research link</h2>
      <form
        className={styles.controls}
        onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          try {
            const result = researchRepository.add({
              kind: String(form.get('kind')) as ResearchBookmark['kind'],
              label: String(form.get('label')),
              path: String(form.get('path')),
              createdAt: new Date().toISOString(),
            });
            setStore(result);
            setMessage('Research link saved.');
            e.currentTarget.reset();
          } catch {
            setMessage(
              'Unable to save. Use a valid internal route, a label and at most 100 bookmarks.',
            );
          }
        }}
      >
        <label>
          Bookmark type
          <select name="kind">
            <option value="player">Player</option>
            <option value="team">Team</option>
            <option value="comparison">Comparison</option>
            <option value="analysis">Analysis filters</option>
            <option value="page">Page</option>
          </select>
        </label>
        <label>
          Bookmark name
          <input name="label" required maxLength={100} />
        </label>
        <label>
          Internal research path
          <input
            name="path"
            required
            maxLength={1500}
            placeholder="/players/201939/insights?season=2023-24"
          />
        </label>
        <button type="submit">Save bookmark</button>
      </form>
      <h2>Saved research ({store.data.bookmarks.length}/100)</h2>
      <p>Maximum 100 bookmarks and 100,000 serialized JSON characters.</p>
      {store.data.bookmarks.length === 0 ? (
        <p>No saved research yet.</p>
      ) : (
        <ul>
          {store.data.bookmarks.map((item) => (
            <li key={`${item.kind}:${item.path}`}>
              <Link to={item.path}>{item.label}</Link> ({item.kind}){' '}
              <button
                onClick={() => {
                  setStore(
                    researchRepository.save({
                      version: 1,
                      bookmarks: store.data.bookmarks.filter(
                        (b) => b.kind !== item.kind || b.path !== item.path,
                      ),
                    }),
                  );
                  setMessage('Bookmark removed.');
                }}
              >
                Remove {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2>Import and export</h2>
      <button
        onClick={() => {
          setExportText(JSON.stringify(store.data, null, 2));
          setMessage('Export prepared. Copy the JSON below to a file.');
        }}
      >
        Export preferences JSON
      </button>
      {exportText && (
        <label>
          Exported preferences JSON
          <textarea readOnly value={exportText} onFocus={(e) => e.target.select()} />
        </label>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const imported = parseResearchJson(importText);
            const next = mergeResearch(store.data, imported);
            setStore(researchRepository.save(next));
            setMessage(
              'Valid JSON imported. Existing bookmarks preserved; duplicates skipped.',
            );
            setImportText('');
          } catch (error) {
            setMessage(
              error instanceof Error &&
                error.message.startsWith('Research JSON exceeds')
                ? error.message
                : 'Import rejected. Check JSON version, size, bookmark limit and safe internal links. Existing research was preserved.',
            );
          }
        }}
      >
        <label>
          Import preferences JSON
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            maxLength={MAX_RESEARCH_JSON_CHARS}
          />
        </label>
        <button type="submit">Import JSON and keep existing research</button>
      </form>
      <h2>Clear local research</h2>
      <RecentHistoryPanel key={recentReset} />
      {confirmClear ? (
        <div role="group" aria-label="Confirm clearing local research">
          <p>
            Clear every saved bookmark on this device? Export first if you want a
            backup.
          </p>
          <button
            onClick={() => {
              const result = researchRepository.clear();
              recentHistoryRepository.clear(true);
              setRecentReset((n) => n + 1);
              setStore(result);
              setConfirmClear(false);
              setImportText('');
              setExportText('');
              setMessage(result.warning ?? 'Local research cleared.');
            }}
          >
            Confirm clear all
          </button>{' '}
          <button onClick={() => setConfirmClear(false)}>Cancel clear</button>
        </div>
      ) : (
        <button onClick={() => setConfirmClear(true)}>Clear all local research</button>
      )}
    </ResearchShell>
  );
}
