import { Link, useParams } from 'react-router';
import {
  ArchiveGameIdSchema,
  LeagueGameIdSchema,
} from '@nba-performance-explorer/contracts';
import { ResearchShell } from '../research/ResearchShell';
import { SaveResearchButton } from '../my-nba/SaveResearchButton';
import { GamesArchivePage } from '../wiki-archive/GamesArchivePage';
import { LeagueGameDetail } from './LeagueGameDetail';

/**
 * /games/:gameId. Recorded 2024 playoff games keep their Wikipedia film-room page, with NBA.com's
 * box score and play-by-play added below; every other NBA game uses the NBA.com page.
 */
export function GameRoute() {
  const { gameId = '' } = useParams();
  if (ArchiveGameIdSchema.safeParse(gameId).success)
    return (
      <>
        <GamesArchivePage />
        <div className="fr wrap">
          <LeagueGameDetail gameId={gameId} withHero={false} />
        </div>
      </>
    );
  return <LeagueGamePage gameId={gameId} />;
}

function LeagueGamePage({ gameId }: { gameId: string }) {
  const valid = LeagueGameIdSchema.safeParse(gameId).success;
  return (
    <ResearchShell title="Game">
      <p>
        <Link to="/games">Scoreboard</Link>
      </p>
      {valid ? (
        <>
          <LeagueGameDetail gameId={gameId} />
          <SaveResearchButton
            kind="analysis"
            label={`Game ${gameId}`}
            path={`/games/${gameId}`}
          />
        </>
      ) : (
        <p role="alert">
          That is not an NBA game ID. Game pages use IDs such as nba:0022400001.{' '}
          <Link to="/games">Open the scoreboard</Link>
        </p>
      )}
    </ResearchShell>
  );
}
