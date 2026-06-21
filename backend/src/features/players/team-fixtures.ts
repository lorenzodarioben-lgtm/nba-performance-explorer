// Provider-private team metadata. Centralising city and nickname here avoids repeating
// the same team strings in every player fixture and keeps them internally consistent.
// These values never leave the provider untyped; the profile mapper copies them into the
// shared `TeamProfile` domain model.
export interface FixtureTeam {
  name: string;
  city: string;
}

export const fixtureTeams: Readonly<Record<string, FixtureTeam>> = {
  ATL: { name: 'Hawks', city: 'Atlanta' },
  BKN: { name: 'Nets', city: 'Brooklyn' },
  BOS: { name: 'Celtics', city: 'Boston' },
  CLE: { name: 'Cavaliers', city: 'Cleveland' },
  DAL: { name: 'Mavericks', city: 'Dallas' },
  DEN: { name: 'Nuggets', city: 'Denver' },
  GSW: { name: 'Warriors', city: 'Golden State' },
  LAL: { name: 'Lakers', city: 'Los Angeles' },
  MIL: { name: 'Bucks', city: 'Milwaukee' },
  MIN: { name: 'Timberwolves', city: 'Minnesota' },
  NOP: { name: 'Pelicans', city: 'New Orleans' },
  NYK: { name: 'Knicks', city: 'New York' },
  OKC: { name: 'Thunder', city: 'Oklahoma City' },
  ORL: { name: 'Magic', city: 'Orlando' },
  PHX: { name: 'Suns', city: 'Phoenix' },
  SAC: { name: 'Kings', city: 'Sacramento' },
  SAS: { name: 'Spurs', city: 'San Antonio' },
  UTA: { name: 'Jazz', city: 'Utah' },
};
