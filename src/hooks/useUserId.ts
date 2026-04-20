import { useMemo } from 'react';

const USER_ID_KEY = 'jobs_agent_user_id';

export function useUserId() {
  return useMemo(() => {
    if (typeof window === 'undefined') return null;

    const existing = localStorage.getItem(USER_ID_KEY);
    if (existing) return existing;

    const generated = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, generated);
    return generated;
  }, []);
}
