'use client';

import { useEffect } from 'react';

// TimeTree doesn't publish an official custom URL scheme, so this is a
// best-effort guess. If it's wrong, nothing happens when we try to open it —
// the fallback timer below still fires and sends the person to the correct
// store either way, so this degrades gracefully rather than breaking.
const TIMETREE_SCHEME = 'timetree://';

const APP_STORE_URL = 'https://apps.apple.com/app/apple-store/id952578473?pt=111449809&ct=promoweb&mt=8';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=works.jubilee.timetree&utm_source=promoweb';
const WEB_URL = 'https://timetreeapp.com/intl/en';

export default function TimeTreeRedirectPage() {
  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isAndroid = /android/i.test(ua);

    if (!isIOS && !isAndroid) {
      // Desktop / anything else: TimeTree doesn't have a desktop app, so
      // just send them to the website.
      window.location.href = WEB_URL;
      return;
    }

    const storeUrl = isIOS ? APP_STORE_URL : PLAY_STORE_URL;
    let fallbackFired = false;

    const goToStore = () => {
      if (fallbackFired) return;
      fallbackFired = true;
      window.location.href = storeUrl;
    };

    // If the app opens successfully, the browser tab gets backgrounded and
    // this timer never gets the chance to run (or we cancel it below).
    const timer = window.setTimeout(goToStore, 1500);

    const cancelFallback = () => window.clearTimeout(timer);
    window.addEventListener('blur', cancelFallback, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelFallback();
    }, { once: true });

    window.location.href = TIMETREE_SCHEME;

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="page-shell">
      <div className="section-header section-header--wrap">
        <h1>Opening TimeTree...</h1>
      </div>
      <section className="panel accent-blue" aria-label="Opening TimeTree">
        <p style={{ color: '#76716c' }}>
          If nothing happens in a moment, TimeTree may not be installed yet — you'll be redirected
          to the App Store or Play Store automatically. Or{' '}
          <a href={WEB_URL} style={{ color: '#1e3a5f', fontWeight: 600 }}>tap here</a> to open TimeTree's website.
        </p>
      </section>
    </main>
  );
}
