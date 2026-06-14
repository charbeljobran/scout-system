'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const links = [
  { href: '/', label: 'Home' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCG, setIsCG] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          setIsCG(false);
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
        } else {
          setIsCG(data.role === 'cg');
        }
      } catch {
        setIsCG(false);
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