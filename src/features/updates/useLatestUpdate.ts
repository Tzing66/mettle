import * as Updates from 'expo-updates';
import { useEffect, useState } from 'react';

const CHECK_TIMEOUT_MS = 3000;

/**
 * On a cold start in an installed build, checks for a newer published update
 * while the splash screen is still up. If one downloads within the timeout the
 * app reloads into it immediately, so testers never need the "open it twice"
 * dance. Slow or offline networks just carry on with the current version (the
 * download continues in the background and applies next launch).
 *
 * Returns true once the app may render. No-op in dev and Expo Go.
 */
export function useLatestUpdate(): boolean {
  const [done, setDone] = useState(!Updates.isEnabled || __DEV__);

  useEffect(() => {
    if (done) return;
    let cancelled = false;
    const finish = () => {
      if (!cancelled) setDone(true);
    };
    const timer = setTimeout(finish, CHECK_TIMEOUT_MS);

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable) return finish();
        const fetched = await Updates.fetchUpdateAsync();
        if (fetched.isNew && !cancelled) {
          clearTimeout(timer);
          await Updates.reloadAsync();
          return;
        }
        finish();
      } catch {
        finish();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [done]);

  return done;
}
