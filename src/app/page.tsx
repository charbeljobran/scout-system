'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MEMBER_ACCESS_ROLES } from '@/lib/members';

type Feature = {
  href: string;
  title: string;
  accent: string;
  emoji: string;
};

const features: Feature[] = [
  {
    href: '/inventory/intendant',
    title: 'Intendant',
    accent: 'accent-gray',
    emoji: '🍳',
  },
  {
    href: '/inventory/materiel',
    title: 'Gérant de Matériel',
    accent: 'accent-gray',
    emoji: '🎒',
  },
];

export default function Home() {
  const [isCG, setIsCG] = useState(false);
  const [canAccessMembers, setCanAccessMembers] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        setRoleChecked(true);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('id', userId)
        .single();
      setIsCG(data?.role === 'cg');
      setCanAccessMembers(MEMBER_ACCESS_ROLES.includes(data?.role ?? ''));
      setRoleChecked(true);
    };
    checkRole();
  }, []);

  return (
    <main className="landing-shell">
      <div className="landing-header">
        <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="72" height="72" />
        <h1>Scout Inventory</h1>
        <p>Select a section to get started</p>
      </div>

      <div className="landing-grid">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className={`landing-card panel ${feature.accent}`}>
            <span className="landing-card__emoji">{feature.emoji}</span>
            <h2 className="landing-card__title">{feature.title}</h2>
          </Link>
        ))}

        {!roleChecked && (
          <>
            <div className="landing-card--skeleton skeleton" aria-hidden="true" />
            <div className="landing-card--skeleton skeleton" aria-hidden="true" />
          </>
        )}

        {roleChecked && canAccessMembers && (
          <Link href="/members" className="landing-card panel accent-orange">
            <span className="landing-card__emoji">🧑‍🤝‍🧑</span>
            <h2 className="landing-card__title">Members</h2>
          </Link>
        )}

        <Link href="/notes" className="landing-card panel accent-blue">
          <span className="landing-card__emoji">📝</span>
          <h2 className="landing-card__title">Meeting Notes</h2>
        </Link>

        <Link href="/timetree" className="landing-card panel accent-green">
          <span className="landing-card__external" aria-hidden="true">↗</span>
          <span className="landing-card__emoji">📅</span>
          <h2 className="landing-card__title">TimeTree</h2>
        </Link>

        <Link href="/contact" className="landing-card panel accent-red landing-card--contact">
          <span className="landing-card__emoji">📬</span>
          <h2 className="landing-card__title">Contact</h2>
        </Link>

        {roleChecked && isCG && (
          <Link href="/admin" className="landing-card panel accent-gold landing-card--contact">
            <span className="landing-card__emoji">⚙️</span>
            <h2 className="landing-card__title">Admin</h2>
          </Link>
        )}
      </div>
    </main>
  );
}