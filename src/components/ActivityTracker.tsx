'use client';

import { useEffect } from 'react';

export default function ActivityTracker() {
  useEffect(() => {
    const updateActivity = () => {
      document.cookie = `last_activity=${Date.now()}; path=/; samesite=lax`;
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