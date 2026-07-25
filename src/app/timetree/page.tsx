'use client';

import { useEffect, useState } from 'react';

// TimeTree doesn't publish an official custom URL scheme, so this is a
// best-effort guess. If it's wrong, nothing happens when we try to open it —
// the fallback timer below still fires and sends the person to the correct
// store either way.
const TIMETREE_SCHEME = 'timetree://';

// market:// forces Android to open the native Play Store app. The plain
// https://play.google.com/... link often opens as a browser page instead,
// which is not what we want here.
const PLAY_STORE_APP_URL = 'market://details?id=works.jubilee.timetree';
const PLAY_STORE_WEB_URL = 'https://play.google.com/store/apps/details?id=works.jubilee.timetree&utm_source=promoweb';
const APP_STORE_URL = 'https://apps.apple.com/app/apple-store/id952578473?pt=111449809&ct=promoweb&mt=8';
const WEB_URL = 'https://timetreeapp.com/intl/en';

export default function TimeTreeRedirectPage() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other' | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || '';
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform('ios');
    else if (/android/i.test(ua)) setPlatform('android');
    else setPlatform('other');
  }, []);

  const handleOpen = () => {
    if (platform !== 'ios' && platform !== 'android') {
      window.location.href = WEB_URL;
      return;
    }

    const storeUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_APP_URL;
    let fallbackFired = false;

    const goToStore = () => {
      if (fallbackFired) return;
      fallbackFired = true;
      window.location.href = storeUrl;
    };

    // If the app opens, this tab gets backgrounded and the timer below
    // either never fires or gets cancelled by the blur/visibility listeners.
    const timer = window.setTimeout(goToStore, 1500);
    const cancelFallback = () => window.clearTimeout(timer);
    window.addEventListener('blur', cancelFallback, { once: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelFallback();
    }, { once: true });

    // This runs as part of the same tap, so mobile browsers treat it as a
    // real user gesture and allow the custom-scheme navigation attempt
    // (unlike firing this automatically on page load, which gets blocked).
    window.location.href = TIMETREE_SCHEME;
  };

  return (
    <main className="page-shell">
      <div className="section-header section-header--wrap">
        <h1>TimeTree</h1>
      </div>
      <section className="panel accent-blue" aria-label="Open TimeTree" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>
        <p style={{ color: '#76716c', marginBottom: 20 }}>
          Tap below to open TimeTree. If it's not installed, you'll be taken to the App Store or Play Store instead.
        </p>
        <button type="button" className="button button--primary" onClick={handleOpen}>
          Open TimeTree
        </button>
        <p style={{ marginTop: 16 }}>
          <a href={WEB_URL} style={{ color: '#1e3a5f', fontSize: 13 }}>Or open TimeTree's website</a>
        </p>
        {platform === 'android' && (
          <p style={{ marginTop: 8 }}>
            <a href={PLAY_STORE_WEB_URL} style={{ color: '#76716c', fontSize: 12 }}>Having trouble? Open Play Store page directly</a>
          </p>
        )}
      </section>
    </main>
  );
}
