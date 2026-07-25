'use client';

import { useEffect, useState } from 'react';

// TimeTree doesn't use a custom URL scheme — it uses Universal Links /
// App Links on its own short-link domain, timetr.ee (confirmed from a real
// share link: https://timetr.ee/s/<code>). A placeholder code still
// triggers the app-open handoff without risking inviting anyone to a real
// calendar the way a genuine invite link would.
const TIMETREE_HOST = 'timetr.ee';
const TIMETREE_PATH = '/s/open';
const TIMETREE_APP_LINK = `https://${TIMETREE_HOST}${TIMETREE_PATH}`;

const PLAY_STORE_PACKAGE = 'works.jubilee.timetree';
const PLAY_STORE_WEB_URL = `https://play.google.com/store/apps/details?id=${PLAY_STORE_PACKAGE}`;
const PLAY_STORE_APP_URL = `market://details?id=${PLAY_STORE_PACKAGE}`;
const APP_STORE_URL = 'https://apps.apple.com/app/apple-store/id952578473?pt=111449809&ct=promoweb&mt=8';
const WEB_URL = 'https://timetreeapp.com/intl/en';

// Android's plain https tap doesn't reliably hand off to the app the way
// iOS's Universal Links do — the digital-asset-link verification Android
// requires is stricter and easy for it to silently fail. An intent:// URL
// is the standard, more reliable way to ask Android "open whichever app is
// registered for this domain, and only fall back to the browser if it truly
// isn't installed" instead of relying on that verification succeeding.
const ANDROID_INTENT_URL =
  `intent://${TIMETREE_HOST}${TIMETREE_PATH}#Intent;scheme=https;package=${PLAY_STORE_PACKAGE};` +
  `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_WEB_URL)};end`;

export default function TimeTreeRedirectPage() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other' | null>(null);

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || '';
    if (/iPad|iPhone|iPod/.test(ua)) setPlatform('ios');
    else if (/android/i.test(ua)) setPlatform('android');
    else setPlatform('other');
  }, []);

  const openLink = platform === 'android' ? ANDROID_INTENT_URL : TIMETREE_APP_LINK;
  const storeUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_APP_URL;
  const storeLabel = platform === 'ios' ? 'Open in App Store' : 'Open in Play Store';

  return (
    <main className="page-shell">
      <div className="section-header section-header--wrap">
        <h1>TimeTree</h1>
      </div>
      <section className="panel accent-blue" aria-label="Open TimeTree" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>

        {(platform === 'ios' || platform === 'android') ? (
          <>
            <p style={{ color: '#76716c', marginBottom: 20 }}>
              Tap below to open TimeTree. If nothing happens (it's probably not installed yet),
              tap "{storeLabel}" instead.
            </p>
            <a href={openLink} className="button button--primary" style={{ display: 'inline-block', marginBottom: 12 }}>
              Open TimeTree
            </a>
            <br />
            <a href={storeUrl} className="button button--secondary" style={{ display: 'inline-block' }}>
              {storeLabel}
            </a>
          </>
        ) : (
          <p style={{ color: '#76716c', marginBottom: 20 }}>
            TimeTree doesn't have a desktop app — open it in your browser instead.
          </p>
        )}

        <p style={{ marginTop: 20 }}>
          <a href={WEB_URL} style={{ color: '#1e3a5f', fontSize: 13 }}>Or open TimeTree's website</a>
        </p>
      </section>
    </main>
  );
}
