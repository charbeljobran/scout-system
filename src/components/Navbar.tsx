'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const links = [
  { href: '/', label: 'Home' },
  { href: '/contact', label: 'Contact' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Only show on department/inventory pages
  const isHidden = pathname === '/login' || pathname === '/';
  if (isHidden) return null;

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
          <button className="button button--secondary nav-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}