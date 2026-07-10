'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MEMBER_ACCESS_ROLES } from '@/lib/members';

const links = [
  { href: '/', label: 'Home' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCG, setIsCG] = useState(false);
  const [canAccessMembers, setCanAccessMembers] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          setIsCG(false);
          setCanAccessMembers(false);
          setRoleChecked(true);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('id', userId)
          .single();

        if (error || !data) {
          setIsCG(false);
          setCanAccessMembers(false);
        } else {
          setIsCG(data.role === 'cg');
          setCanAccessMembers(MEMBER_ACCESS_ROLES.includes(data.role));
        }
      } catch {
        setIsCG(false);
        setCanAccessMembers(false);
      } finally {
        setRoleChecked(true);
      }
    };

    checkRole();
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const isHidden = pathname === '/login' || pathname === '/';
  if (isHidden) return null;

  // Don't render nav items until role is confirmed
  if (!roleChecked) return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="brand" href="/">
          <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="36" height="36" />
          <span>Scout Inventory</span>
        </Link>
        <nav className="nav-links">
          <button className="button button--secondary nav-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );

  return (
    <header className="navbar">
      <div className="navbar__inner">
        <Link className="brand" href="/">
          <img src="/sdlmwm-logo.jpg" alt="Scout Du Liban" width="36" height="36" />
          <span>Scout Inventory</span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              className={`nav-link ${pathname === link.href ? 'nav-link--active' : ''}`}
              href={link.href}
            >
              {link.label}
            </Link>
          ))}
          {canAccessMembers && (
            <Link
              className={`nav-link ${pathname === '/members' ? 'nav-link--active' : ''}`}
              href="/members"
            >
              Members
            </Link>
          )}
          {isCG && (
            <Link
              className={`nav-link ${pathname === '/admin' ? 'nav-link--active' : ''}`}
              href="/admin"
            >
              Admin
            </Link>
          )}
          <button className="button button--secondary nav-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}