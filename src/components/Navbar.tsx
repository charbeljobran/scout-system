'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { MEMBER_ACCESS_ROLES } from '@/lib/members';

const links = [
  { href: '/', label: 'Home' },
  { href: '/contact', label: 'Contact' },
  { href: '/notes', label: 'Notes' },
];

type NotificationRow = {
  id: string;
  meeting_date: string;
  branch: string;
  edited_by_email: string;
  previous_present: boolean;
  new_present: boolean;
  created_at: string;
  notified_at: string | null;
  members: { first_name: string; last_name: string } | null;
};

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isCG, setIsCG] = useState(false);
  const [canAccessMembers, setCanAccessMembers] = useState(false);
  const [canSeeNotifications, setCanSeeNotifications] = useState(false);
  const [roleChecked, setRoleChecked] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('attendance_edit_events')
      .select('id, meeting_date, branch, edited_by_email, previous_present, new_present, created_at, notified_at, members(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(30);

    const rows = (data as unknown as NotificationRow[]) ?? [];
    setNotifications(rows);
    setUnreadCount(rows.filter(r => !r.notified_at).length);
  };

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const userId = userData.user?.id;

        if (!userId) {
          setIsCG(false);
          setCanAccessMembers(false);
          setCanSeeNotifications(false);
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
          setCanSeeNotifications(false);
        } else {
          setIsCG(data.role === 'cg');
          setCanAccessMembers(MEMBER_ACCESS_ROLES.includes(data.role));
          const seesNotifications = data.role === 'cg';
          setCanSeeNotifications(seesNotifications);
          if (seesNotifications) fetchNotifications();
        }
      } catch {
        setIsCG(false);
        setCanAccessMembers(false);
        setCanSeeNotifications(false);
      } finally {
        setRoleChecked(true);
      }
    };

    checkRole();
  }, [pathname]);

  const handleToggleNotifications = async () => {
    const opening = !showNotifications;
    setShowNotifications(opening);

    if (opening && unreadCount > 0) {
      const unreadIds = notifications.filter(n => !n.notified_at).map(n => n.id);
      const now = new Date().toISOString();

      await supabase.from('attendance_edit_events').update({ notified_at: now }).in('id', unreadIds);

      setNotifications(prev => prev.map(n => unreadIds.includes(n.id) ? { ...n, notified_at: now } : n));
      setUnreadCount(0);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/mfa/session', { method: 'DELETE' });
    await supabase.auth.signOut();
    router.push('/login');
  };

  useEffect(() => {
    if (!showNotifications) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [showNotifications]);

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
          {canSeeNotifications && (
            <div className="notif-bell-wrap">
              <button
                type="button"
                className="notif-bell"
                onClick={handleToggleNotifications}
                aria-label="Attendance edit notifications"
              >
                🔔
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </button>
              {showNotifications && (
                <div className="notif-overlay" onClick={() => setShowNotifications(false)}>
                  <div className="notif-modal" onClick={e => e.stopPropagation()}>
                    <div className="notif-modal__header">
                      Attendance Edits
                      <button
                        className="history-close"
                        type="button"
                        onClick={() => setShowNotifications(false)}
                        aria-label="Close"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="notif-modal__body">
                      {notifications.length === 0 ? (
                        <p className="notif-empty">No edits yet.</p>
                      ) : (
                        <div className="notif-list">
                          {notifications.map(n => (
                            <div className={`notif-item ${!n.notified_at ? 'notif-item--unread' : ''}`} key={n.id}>
                              <p className="notif-item__text">
                                <strong>{n.edited_by_email}</strong> edited attendance for{' '}
                                <strong>{n.members ? `${n.members.first_name} ${n.members.last_name}` : 'a member'}</strong> on{' '}
                                {new Date(`${n.meeting_date}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                {' — '}{n.branch}
                              </p>
                              <p className="notif-item__change">
                                {n.previous_present ? 'Present' : 'Absent'} → {n.new_present ? 'Present' : 'Absent'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          <button className="button button--secondary nav-signout" onClick={handleLogout}>
            Sign Out
          </button>
        </nav>
      </div>
    </header>
  );
}