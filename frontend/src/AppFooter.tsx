import { Link } from 'react-router';

import { SECTIONS } from './shell/sections';

// The closing frame of every route (contentinfo landmark): the sign-off, the sections, the
// sources and the single non-affiliation notice, which stays plainly readable. Nothing here
// claims live data: player statistics are queried on request and archives are fixed snapshots.
export function AppFooter() {
  const columns = [
    SECTIONS.filter((section) => ['players', 'teams', 'games'].includes(section.id)),
    SECTIONS.filter((section) => ['seasons', 'compare', 'labs'].includes(section.id)),
  ];
  return (
    <footer className="foot">
      <span className="foot__ghost" aria-hidden="true">
        NBA
      </span>
      <div className="wrap">
        <div className="foot__grid">
          <div>
            <p className="t-eyebrow">NBA Performance Explorer</p>
            <p className="foot__sign" aria-hidden="true">
              Read
              <span>the game.</span>
            </p>
          </div>
          {columns.map((group, index) => (
            <nav key={index} aria-label={index === 0 ? 'Footer' : 'Footer research'}>
              <p className="foot__head">{index === 0 ? 'Explore' : 'Study'}</p>
              <ul className="foot__links">
                {group.map((section) => (
                  <li key={section.id}>
                    <Link to={section.to}>{section.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
          <div>
            <p className="foot__head">Sources</p>
            <ul className="foot__links">
              <li>
                <Link to="/explore">What&rsquo;s on tape</Link>
              </li>
              <li>
                <Link to="/explore/coverage">Data coverage</Link>
              </li>
              <li>
                <Link to="/my-nba">My NBA</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="foot__legal">
          <p>
            Unofficial project, not affiliated with the NBA. Statistics sourced from
            NBA.com on request, plus labelled historical archives (Wikipedia, Wikidata,
            CC0 and open research datasets). Nothing on this site is a live feed.
          </p>
          <p className="t-meta">Every module names its source tape</p>
        </div>
      </div>
    </footer>
  );
}
