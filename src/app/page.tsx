'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MEMBER_ACCESS_ROLES } from '@/lib/members';
import { KitchenIcon, GearBagIcon, PeopleIcon, NotesIcon, CalendarIcon, MailIcon, GearAdminIcon } from '@/components/icons/ScoutIcons';

type Feature = {
  href: string;
  title: string;
  desc: string;
  accent: string;
  icon: React.ComponentType<{ className?: string }>;
};

const features: Feature[] = [
  {
    href: '/inventory/intendant',
    title: 'Intendant',
    desc: 'Kitchen & food stock',
    accent: 'accent-gray',
    icon: KitchenIcon,
  },
  {
    href: '/inventory/materiel',
    title: 'Gérant de Matériel',
    desc: 'Gear & equipment',
    accent: 'accent-gray',
    icon: GearBagIcon,
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
        <span className="landing-header__badge">
          <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="72" height="72" />
        </span>
        <h1>Scout Inventory</h1>
        <p>Select a section to get started</p>
      </div>

      <div className="landing-grid">
        {features.map((feature) => (
          <Link key={feature.href} href={feature.href} className={`landing-card panel ${feature.accent}`}>
            <feature.icon className="landing-card__icon" />
            <h2 className="landing-card__title">{feature.title}</h2>
            <p className="landing-card__desc">{feature.desc}</p>
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
            <PeopleIcon className="landing-card__icon" />
            <h2 className="landing-card__title">Members</h2>
            <p className="landing-card__desc">Roster & attendance</p>
          </Link>
        )}

        <Link href="/notes" className="landing-card panel accent-blue">
          <NotesIcon className="landing-card__icon" />
          <h2 className="landing-card__title">Meeting Notes</h2>
          <p className="landing-card__desc">Agendas & minutes</p>
        </Link>

        <Link href="/timetree" className="landing-card panel accent-green">
          <span className="landing-card__external" aria-hidden="true">↗</span>
          <CalendarIcon className="landing-card__icon" />
          <h2 className="landing-card__title">TimeTree</h2>
          <p className="landing-card__desc">Shared calendar</p>
        </Link>

        <Link href="/contact" className="landing-card panel accent-red landing-card--contact">
          <MailIcon className="landing-card__icon" />
          <h2 className="landing-card__title">Contact</h2>
          <p className="landing-card__desc">Reach the team</p>
        </Link>

        {roleChecked && isCG && (
          <Link href="/admin" className="landing-card panel accent-gold landing-card--contact">
            <GearAdminIcon className="landing-card__icon" />
            <h2 className="landing-card__title">Admin</h2>
            <p className="landing-card__desc">Manage accounts & access</p>
          </Link>
        )}
      </div>
    </main>
  );
}