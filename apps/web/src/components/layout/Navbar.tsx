// apps/web/src/components/layout/Navbar.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Button } from '../ui/Button';
import { Role } from '@hbms/shared';
import { Building2, Compass, User, LogOut, ShieldCheck, Hotel, Bell, Star, Check } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { ReviewModal } from '../reviews/ReviewModal';

export interface NavbarProps {
  dark?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ dark = false }) => {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedReviewTarget, setSelectedReviewTarget] = useState<{
    hotelId: string;
    hotelName?: string;
    reservationId?: string;
  } | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiFetch<{ notifications: any[]; unreadCount: number }>('/notifications');
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      // ignore
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/notifications/read-all', { method: 'PATCH' });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.is_read) {
      try {
        await apiFetch(`/notifications/${notif.id}/read`, { method: 'PATCH' });
        setUnreadCount((c) => Math.max(c - 1, 0));
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
      } catch {
        // ignore
      }
    }

    if (notif.type === 'CHECKOUT_COMPLETE' && notif.metadata?.hotelId) {
      setIsNotifOpen(false);
      if (!notif.isReviewed) {
        setSelectedReviewTarget({
          hotelId: notif.metadata.hotelId,
          hotelName: notif.metadata.hotelName,
          reservationId: notif.metadata.reservationId,
        });
      }
    }
  };

  const getPortalLink = () => {
    if (!user) return null;
    switch (user.role) {
      case Role.PLATFORM_ADMIN:
        return { label: 'Admin Console', href: '/admin/applications', icon: ShieldCheck };
      case Role.HOTEL_MANAGER:
        return { label: 'Manager Portal', href: '/manage/dashboard', icon: Hotel };
      case Role.RECEPTIONIST:
        return { label: 'Front Desk', href: '/manage/dashboard', icon: Building2 };
      case Role.HOUSEKEEPING:
        return { label: 'Housekeeping', href: '/manage/dashboard', icon: Building2 };
      default:
        return null;
    }
  };

  const portal = getPortalLink();

  const headerClass = dark
    ? 'sticky top-0 z-40 w-full bg-black/90 backdrop-blur-md border-b border-neutral-800/80 transition-all select-none'
    : 'sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-neutral-200 transition-all select-none';

  const brandClass = dark
    ? 'text-2xl sm:text-3xl tracking-tight text-white font-normal hover:opacity-80 transition-opacity'
    : 'text-2xl sm:text-3xl tracking-tight text-black font-normal hover:opacity-80 transition-opacity';

  const navLinkClass = (href: string) => {
    const isActive = pathname === href || (href === '/reservations' && pathname === '/bookings');
    if (dark) {
      return isActive
        ? 'text-white font-normal transition-colors'
        : 'text-neutral-400 hover:text-white transition-colors font-normal';
    }
    return isActive
      ? 'text-neutral-900 font-normal transition-colors'
      : 'text-neutral-600 hover:text-black transition-colors font-normal';
  };

  return (
    <header className={headerClass}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 sm:h-18 flex items-center justify-between">
        {/* Left Side: Brand Name & Nav Links Pushed Left */}
        <div className="flex items-center gap-10">
          <Link href="/" className={brandClass}>
            Voyage.
          </Link>

          {/* Left-Aligned Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm sm:text-base font-normal">
            <Link href="/" className={navLinkClass('/')}>
              Home
            </Link>
            <Link href="/search" className={navLinkClass('/search')}>
              Find Hotels
            </Link>
            <Link href="/explore" className={navLinkClass('/explore')}>
              Global Explorer
            </Link>
            <Link href="/reservations" className={navLinkClass('/reservations')}>
              Bookings
            </Link>
            <Link href="/#recommended" className={navLinkClass('/#recommended')}>
              Destinations
            </Link>
          </nav>
        </div>

        {/* Right Side: Auth / Actions */}
        <div className="flex items-center gap-3.5">
          {/* Notification Bell (Displayed exclusively for logged-in users, replaces language toggle) */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen(!isNotifOpen);
                  if (!isNotifOpen) loadNotifications();
                }}
                className={
                  dark
                    ? 'relative p-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 select-none transition-colors cursor-pointer flex items-center justify-center'
                    : 'relative p-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border border-neutral-200 select-none transition-colors cursor-pointer flex items-center justify-center'
                }
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-600 rounded-full ring-2 ring-white dark:ring-black animate-pulse" />
                )}
              </button>

              {/* Notifications Popover Dropdown */}
              {isNotifOpen && (
                <div
                  className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl shadow-xl border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150 ${
                    dark
                      ? 'bg-neutral-900 border-neutral-800 text-white'
                      : 'bg-white border-neutral-200 text-neutral-900'
                  }`}
                >
                  <div
                    className={`p-3.5 border-b flex items-center justify-between text-xs font-normal ${
                      dark ? 'border-neutral-800' : 'border-neutral-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-neutral-900 font-normal">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-red-50 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-mono">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[11px] text-neutral-500 hover:text-black font-normal transition-colors cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-neutral-100">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                            notif.is_read
                              ? 'bg-transparent opacity-70 hover:opacity-100 hover:bg-neutral-50'
                              : 'bg-neutral-50/80 hover:bg-neutral-100/80'
                          }`}
                        >
                          <div className="mt-1 shrink-0">
                            {!notif.is_read ? (
                              <span className="w-2 h-2 rounded-full bg-red-600 block" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-transparent block" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <h5 className="text-xs font-normal text-neutral-900 truncate">
                                {notif.title}
                              </h5>
                              <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                {new Date(notif.created_at).toLocaleDateString([], {
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                            <p className="text-[11px] text-neutral-600 font-normal mt-0.5 line-clamp-2">
                              {notif.message}
                            </p>
                            {notif.type === 'CHECKOUT_COMPLETE' && !notif.isReviewed && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-black bg-white border border-neutral-300 rounded px-2 py-0.5 shadow-2xs hover:bg-neutral-100">
                                  <Star className="w-3 h-3 fill-black text-black" />
                                  Rate Your Stay
                                </span>
                              </div>
                            )}
                            {notif.type === 'CHECKOUT_COMPLETE' && notif.isReviewed && (
                              <div className="mt-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-neutral-500 bg-neutral-100 rounded px-2 py-0.5">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Stay Reviewed
                                </span>
                              </div>
                            )}
                            {notif.type === 'BOOKING_CONFIRMED' && (
                              <div className="mt-2">
                                <Link
                                  href="/reservations"
                                  onClick={() => setIsNotifOpen(false)}
                                  className="text-[11px] text-neutral-800 underline underline-offset-2 hover:text-black font-normal"
                                >
                                  View Booking &rarr;
                                </Link>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-neutral-400 font-normal">
                        No notifications yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              {portal && (
                <Link href={portal.href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className={
                      dark
                        ? 'hidden sm:inline-flex gap-1.5 rounded-full border-neutral-700 text-white hover:bg-neutral-900 font-normal'
                        : 'hidden sm:inline-flex gap-1.5 rounded-full border-black text-black hover:bg-neutral-100 font-normal'
                    }
                  >
                    <portal.icon className="w-3.5 h-3.5" />
                    <span>{portal.label}</span>
                  </Button>
                </Link>
              )}
              <div
                className={`flex items-center gap-2 pl-2 border-l ${
                  dark ? 'border-neutral-800' : 'border-neutral-200'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-normal ${
                    dark
                      ? 'bg-neutral-900 border border-neutral-700 text-white'
                      : 'bg-neutral-100 border border-neutral-300 text-black'
                  }`}
                >
                  {user.firstName[0]}
                  {user.lastName[0]}
                </div>
                <div className="hidden lg:block text-left">
                  <div className={`text-xs font-normal leading-tight ${dark ? 'text-white' : 'text-black'}`}>
                    {user.firstName} {user.lastName}
                  </div>
                  <div className={`text-[10px] uppercase font-normal ${dark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                    {user.role}
                  </div>
                </div>
                <button
                  onClick={() => logout()}
                  title="Log out"
                  className={
                    dark
                      ? 'p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-neutral-900 transition-colors ml-1'
                      : 'p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50 transition-colors ml-1'
                  }
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <Link href="/login">
                <Button
                  variant="ghost"
                  size="sm"
                  className={
                    dark
                      ? 'text-neutral-300 hover:text-white hover:bg-neutral-900 rounded-full font-normal text-xs sm:text-sm px-4'
                      : 'text-neutral-700 hover:text-black rounded-full font-normal text-xs sm:text-sm px-4'
                  }
                >
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button
                  variant="primary"
                  size="sm"
                  className={
                    dark
                      ? 'bg-white hover:bg-neutral-200 text-black rounded-full px-5 py-2 font-normal text-xs sm:text-sm shadow-sm'
                      : 'bg-black hover:bg-neutral-800 text-white rounded-full px-5 py-2 font-normal text-xs sm:text-sm shadow-sm'
                  }
                >
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {selectedReviewTarget && (
        <ReviewModal
          isOpen={true}
          onClose={() => setSelectedReviewTarget(null)}
          hotelId={selectedReviewTarget.hotelId}
          hotelName={selectedReviewTarget.hotelName}
          reservationId={selectedReviewTarget.reservationId}
          onSuccess={() => {
            loadNotifications();
          }}
        />
      )}
    </header>
  );
};
