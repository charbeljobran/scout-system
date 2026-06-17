'use client';

import { useEffect } from 'react';

export default function ActivityTracker() {
  useEffect(() => {
    const updateActivity = () => {
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `last_activity=${Date.now()}; path=/; samesite=lax; expires=${expires}`;
    };

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(e => window.addEventListener(e, updateActivity));
    updateActivity();

    return () => {
      events.forEach(e => window.removeEventListener(e, updateActivity));
    };
  }, []);

  return null;
}