import { MotionConfig } from 'motion/react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

// The in-app motion setting: follow the system, or force reduced or full motion. It is a
// browser-only preference (never sent anywhere), stored under a versioned key with safe recovery.
export type MotionSetting = 'system' | 'reduced' | 'full';

const STORAGE_KEY = 'npe.motion-preference.v1';
const QUERY = '(prefers-reduced-motion: reduce)';

function readStoredSetting(): MotionSetting {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === 'reduced' || value === 'full' || value === 'system') {
      return value;
    }
  } catch {
    // Storage can be unavailable (private mode, blocked site data); fall back to the system.
  }
  return 'system';
}

function subscribeSystem(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const query = window.matchMedia(QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function systemPrefersReduced() {
  return typeof window.matchMedia === 'function' && window.matchMedia(QUERY).matches;
}

interface MotionPreferenceValue {
  setting: MotionSetting;
  setSetting: (setting: MotionSetting) => void;
  /** True when movement should be removed (user setting, or the system when following it). */
  reduced: boolean;
}

const MotionPreferenceContext = createContext<MotionPreferenceValue>({
  setting: 'system',
  setSetting: () => {},
  reduced: false,
});

export function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  const [setting, setSettingState] = useState<MotionSetting>(readStoredSetting);
  const systemReduced = useSyncExternalStore(
    subscribeSystem,
    systemPrefersReduced,
    () => false,
  );
  const reduced = setting === 'reduced' || (setting === 'system' && systemReduced);

  const setSetting = useCallback((next: MotionSetting) => {
    setSettingState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The setting still applies for this visit when storage is unavailable.
    }
  }, []);

  // CSS transitions and keyframes read this attribute, so the same setting governs both systems.
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);

  const value = useMemo(
    () => ({ setting, setSetting, reduced }),
    [setting, setSetting, reduced],
  );

  return (
    <MotionPreferenceContext.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? 'always' : 'never'}>
        {children}
      </MotionConfig>
    </MotionPreferenceContext.Provider>
  );
}

export function useMotionPreference() {
  return useContext(MotionPreferenceContext);
}

/** True when expressive movement may run. */
export function useMotionAllowed() {
  return !useContext(MotionPreferenceContext).reduced;
}
