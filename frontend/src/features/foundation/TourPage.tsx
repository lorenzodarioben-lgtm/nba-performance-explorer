import { Link } from 'react-router';

import { ResearchShell } from '../research/ResearchShell';
import { Slate } from '../../ui/Slate';

/** The guided route through the strongest rooms. Every link is a normal page; nothing is staged. */
const ACTS: readonly {
  act: string;
  title: string;
  steps: readonly { to: string; label: string; doThis: string; proves: string }[];
}[] = [
  {
    act: 'Explore',
    title: 'Start with the record',
    steps: [
      {
        to: '/games/bracket',
        label: '2024 playoff bracket',
        doThis: 'Choose the Finals card, then "Open the film room".',
        proves:
          'All 82 recorded games assembled into series; a winner is named only after a recorded fourth win.',
      },
      {
        to: '/standings/race',
        label: 'Standings race',
        doThis: 'Press play, then switch to the ladder-rank view.',
        proves:
          'The 2023–24 race rebuilt date by date from verified results, not copied standings.',
      },
    ],
  },
  {
    act: 'Investigate',
    title: 'Open a series and a shot chart',
    steps: [
      {
        to: '/games/series/r4-BOS-DAL?game=4',
        label: 'Finals film room',
        doThis:
          'Use the arrow keys along the game tape; read Game 4’s line score and period bars.',
        proves:
          'Margins, halves and comebacks computed only from published period scores.',
      },
      {
        to: '/lab/shots?players=201939&view=density',
        label: 'Shot Studio',
        doThis: 'Choose "Draw a court region" and drag a box around the paint.',
        proves:
          'Every summary, cell and table follows a region drawn on 13,470 real attempts.',
      },
    ],
  },
  {
    act: 'Compare',
    title: 'Ask a comparison question',
    steps: [
      {
        to: '/compare/recorded?players=203999,203507',
        label: 'Comparison studio',
        doThis: 'Read the widest gaps first, then switch the scale to percentile.',
        proves:
          'Players compared inside one stated cohort, with plain statements and exact values.',
      },
      {
        to: '/lab/workbench?view=relationship&metric=pointsPerGame&y=assistsPerGame',
        label: 'Research workbench',
        doThis:
          'Pick a player above the fit line from the "furthest from the line" list.',
        proves:
          'A relationship described honestly: r, the fit line and who departs from it, never a cause.',
      },
    ],
  },
  {
    act: 'Create',
    title: 'Turn findings into a story',
    steps: [
      {
        to: '/my-nba/stories',
        label: 'Statistical stories',
        doThis:
          'Start the Boston example, write a line between the analyses, then "Read and print".',
        proves:
          'Research saved in the browser, re-read live from the tools, printable and shareable.',
      },
    ],
  },
];

export function TourPage() {
  return (
    <ResearchShell
      title="The five-minute tour"
      lede={
        <p>
          A route through the strongest rooms, in the order a presentation would take
          them: explore, investigate, compare, create. Every stop is an ordinary page;
          leave the tour at any point. Everything here is historical and labelled by
          source.
        </p>
      }
    >
      <ol className="tour">
        {ACTS.map((act, a) => (
          <li key={act.act} className="tour__act">
            <Slate
              title={
                <>
                  <span className="tour__no">{String(a + 1).padStart(2, '0')}</span>{' '}
                  {act.act}: {act.title}
                </>
              }
            />
            <ul className="tour__steps">
              {act.steps.map((step) => (
                <li key={step.to} className="tour__step">
                  <Link to={step.to} className="tour__link">
                    {step.label} →
                  </Link>
                  <p>
                    <b>Do:</b> {step.doThis}
                  </p>
                  <p className="tour__proves">
                    <b>Shows:</b> {step.proves}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="fr-note">
        Data in this tour: recorded 2023–24 Wikipedia team pages and 2024 playoff tables
        (CC BY-SA 4.0), Wikidata identifiers (CC0) and a partial 2018 playoff shot
        archive (CC0). Player pages powered by NBA.com appear only when NBA.com is
        reachable; see <Link to="/explore">what&rsquo;s on tape</Link>.
      </p>
    </ResearchShell>
  );
}
