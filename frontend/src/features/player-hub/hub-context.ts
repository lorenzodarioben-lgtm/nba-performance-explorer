import { createContext, useContext, useEffect } from 'react';

export interface HubIdentity {
  playerId: string;
  name: string;
  team?: string | undefined;
  jersey?: string | undefined;
}

export interface HubContextValue {
  setIdentity: (identity: HubIdentity) => void;
  setHeroInView: (inView: boolean) => void;
}

export const HubContext = createContext<HubContextValue | null>(null);

/**
 * A hub page reports who it is about once its data names the player, so the persistent hub bar
 * can show the score bug without requesting the profile itself.
 */
export function useHubIdentity(identity: HubIdentity | null) {
  const hub = useContext(HubContext);
  const playerId = identity?.playerId;
  const name = identity?.name;
  const team = identity?.team;
  const jersey = identity?.jersey;
  useEffect(() => {
    if (hub && playerId && name) hub.setIdentity({ playerId, name, team, jersey });
  }, [hub, playerId, name, team, jersey]);
}

export function useHubHero() {
  return useContext(HubContext)?.setHeroInView;
}
