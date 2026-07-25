'use client';

import { useEffect, useState } from 'react';

// TimeTree doesn't use a custom URL scheme — it uses Universal Links on its
// own short-link domain, timetr.ee (confirmed from a real share link:
// https://timetr.ee/s/<code>). The phone's OS matches on the domain + path
// shape alone to decide whether to hand off to the installed app, before it
// even checks whether the code resolves to anything real — so a made-up
// placeholder code still triggers the app-open handoff, without risking
// inviting anyone to a real calendar the way a genuine invite link would.
const TIMETREE_APP_LINK = 'https://timetr.ee/s/open';

// market:// forces Android to open the native Play Store app. The plain
// https://play.google.com/... link often opens as a browser page instead.
const PLAY_STORE_APP_URL = 'market://details?id=works.jubilee.timetree';
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
            <a href={TIMETREE_APP_LINK} className="button button--primary" style={{ display: 'inline-block', marginBottom: 12 }}>
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
