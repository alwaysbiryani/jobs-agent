import { useState, useEffect } from 'react';

export function useUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedId = localStorage.getItem('jobs_agent_user_id');
    if (storedId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUserId(storedId);
    } else {
      const newId = crypto.randomUUID();
      localStorage.setItem('jobs_agent_user_id', newId);
       
      setUserId(newId);
    }
  }, []);

  return userId;
}
