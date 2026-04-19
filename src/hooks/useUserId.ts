import { useState, useEffect } from 'react';

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem('jobs_agent_user_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('jobs_agent_user_id', id);
    }
    setUserId(id);
  }, []);

  return userId;
}
