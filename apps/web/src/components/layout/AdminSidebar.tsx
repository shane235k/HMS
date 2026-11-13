// apps/web/src/components/layout/AdminSidebar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/authContext';
import { Role, ApplicationStatus } from '@hbms/shared';
import { apiFetch } from '@/lib/api';
import {
  Compass,
  LayoutDashboard,
  Building2,
  Users,
  CalendarDays,
  FileCheck2,
  ShieldAlert,
  Sliders,
  LogOut,
  Sparkles,
  BedDouble,
  IndianRupee,
  ClipboardList
} from 'lucide-react';
import { clsx } from 'clsx';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  disabled?: boolean;
}

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isManager = user?.role === Role.HOTEL_MANAGER;
  const isAdmin = user?.role === Role.PLATFORM_ADMIN;
  const isReceptionist = user?.role === Role.RECEPTIONIST;
  const isHousekeeping = user?.role === Role.HOUSEKEEPING;

  const [hasRegisteredProperty, setHasRegisteredProperty] = useState<boolean>(() =>
    Boolean(user?.hotelId || user?.hasActiveApplication)
  );

  useEffect(() => {
    if (user?.role === Role.HOTEL_MANAGER) {
      if (user.hotelId || user.hasActiveApplication) {
        setHasRegisteredProperty(true);
        return;
      }
      Promise.allSettled([
        apiFetch('/management/property'),
        apiFetch<any>('/applications/my'),
      ]).then(([hotelRes, appRes]) => {
        const hasHotel = hotelRes.status === 'fulfilled' && Boolean(hotelRes.value);
        const hasApp =
          appRes.status === 'fulfilled' &&
          appRes.value &&
          appRes.value.status !== ApplicationStatus.REJECTED;
        setHasRegisteredProperty(Boolean(hasHotel || hasApp));
      }).catch(() => {});
    }
  }, [user]);

  const managerNav: NavItem[] = [
    { label: 'Dashboard', href: '/manage/dashboard', icon: LayoutDashboard },
    { label: 'Register Property', href: '/manage/dashboard?register=true', icon: Building2 },
    { label: 'Front Desk', href: '/reception', icon: CalendarDays },
    { label: 'Housekeeping', href: '/housekeeping', icon: ClipboardList },
    { label: 'Room Inventory', href: '/manage/inventory', icon: BedDouble },
    { label: 'Rates & Calendar', href: '/manage/rates', icon: IndianRupee },
    { label: 'Staff Management', href: '/manage/staff', icon: Users },
  ];

  const filteredManagerNav = isManager && hasRegisteredProperty
    ? managerNav.filter(
        (item) => !item.href.includes('register=true') && item.href !== '/manage/register-property'
      )
    : managerNav;

  const adminNav: NavItem[] = [
    { label: 'Executive Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Hotel Applications', href: '/admin/applications', icon: FileCheck2 },
    { label: 'Registered Hotels', href: '/admin/hotels', icon: Building2 },
    { label: 'Platform Audit', href: '/admin/audit', icon: ClipboardList },
  ];

  const receptionistNav: NavItem[] = [
    { label: 'Front Desk', href: '/reception', icon: CalendarDays },
    { label: 'Room Inventory', href: '/manage/inventory', icon: BedDouble },
  ];

  const housekeepingNav: NavItem[] = [
    { label: 'Housekeeping', href: '/housekeeping', icon: ClipboardList },
  ];

  const navItems: NavItem[] = isAdmin
    ? adminNav
    : isReceptionist
    ? receptionistNav
    : isHousekeeping
    ? housekeepingNav
    : filteredManagerNav;

  return (
    <aside className="w-64 h-screen sticky top-0 shrink-0 bg-white border-r border-charcoal-200 flex flex-col justify-between select-none overflow-y-auto print:hidden">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-charcoal-200/80 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center text-white shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-lg font-normal text-charcoal-900 font-sans tracking-tight">
                Voyage<span className="text-black font-serif italic">.</span>
              </span>
              <span className="text-[9px] block font-mono text-neutral-600 font-normal uppercase tracking-wider -mt-1">
                {isAdmin ? 'Platform Admin' : 'Property Portal'}
              </span>
            </div>
          </Link>
        </div>

        {/* User Context Card */}
        {user && (
          <div className="mx-3.5 my-4 p-3 rounded-xl bg-canvas-neutral border border-charcoal-200/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-neutral-100 border border-neutral-300 flex items-center justify-center text-xs font-normal text-neutral-800">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-normal text-charcoal-900 truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wide">
                  {user.role.replace('_', ' ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Section */}
        <nav className="px-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-charcoal-400 font-normal">
            {isAdmin ? 'System Administration' : 'Hotel Operations'}
          </div>

          {navItems.map((item) => {
            const isRegisterItem = item.href.includes('register=true') || item.href === '/manage/register-property';
            const isRegisterActive = pathname === '/manage/register-property' || (typeof window !== 'undefined' && window.location.search.includes('register=true'));
            const isActive = isRegisterItem ? isRegisterActive : pathname === item.href && !isRegisterActive;
            if (item.disabled) {
              return (
                <div
                  key={item.label}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-normal text-charcoal-400 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-charcoal-100 text-charcoal-500">
                    M2
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-normal transition-all duration-150',
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'text-charcoal-700 hover:bg-canvas-neutral hover:text-charcoal-900'
                )}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Utilities */}
      <div className="p-3 border-t border-charcoal-200 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-normal text-charcoal-600 hover:bg-canvas-neutral hover:text-charcoal-900 transition-colors"
        >
          <Compass className="w-4 h-4 text-neutral-800" />
          <span>View Guest Platform</span>
        </Link>
        <button
          onClick={() => logout()}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
};

