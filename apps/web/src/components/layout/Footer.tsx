// apps/web/src/components/layout/Footer.tsx
import React from 'react';
import Link from 'next/link';
import { ShieldCheck, Compass, CheckCircle2, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-white border-t border-charcoal-200 mt-20">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="space-y-3 md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-normal tracking-tight text-neutral-900">
                Voyage.
              </span>
            </div>
            <p className="text-xs text-neutral-500 leading-relaxed font-normal">
              Curated luxury sanctuaries, architectural destinations, and real-time planetary hospitality reservations worldwide.
            </p>
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-normal">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-700" />
              <span>Verified Direct Reservations</span>
            </div>
          </div>

          {/* Guest Discovery */}
          <div>
            <h4 className="text-xs font-normal uppercase tracking-wider text-neutral-900 mb-3">
              Explore Stays
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500 font-normal">
              <li><Link href="/search" className="hover:text-black transition-colors">Find Hotels</Link></li>
              <li><Link href="/explore" className="hover:text-black transition-colors">Global 3D Explorer</Link></li>
              <li><Link href="/#recommended" className="hover:text-black transition-colors">Featured Destinations</Link></li>
              <li><Link href="/search" className="hover:text-black transition-colors">Curated Sanctuaries</Link></li>
            </ul>
          </div>

          {/* Guest Services & Bookings */}
          <div>
            <h4 className="text-xs font-normal uppercase tracking-wider text-neutral-900 mb-3">
              My Stays & Account
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500 font-normal">
              <li><Link href="/bookings" className="hover:text-black transition-colors">My Bookings</Link></li>
              <li><Link href="/reservations" className="hover:text-black transition-colors">Active Reservations</Link></li>
              <li><Link href="/login" className="hover:text-black transition-colors">Guest Sign In</Link></li>
              <li><Link href="/register" className="hover:text-black transition-colors">Create Guest Account</Link></li>
            </ul>
          </div>

          {/* Guest Trust & Hospitality */}
          <div>
            <h4 className="text-xs font-normal uppercase tracking-wider text-neutral-900 mb-3">
              Guest Assurance
            </h4>
            <ul className="space-y-2 text-xs text-neutral-500 font-normal">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>Best Rate Direct Guarantee</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>Instant Temporary Inventory Lock</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>Transparent Booking Receipts</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-neutral-400 shrink-0" />
                <span>24/7 Guest Hospitality Support</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-charcoal-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-charcoal-500 font-normal">
          <p>© 2026 Voyage Hospitality Platform. All rights reserved.</p>
          <p className="mt-2 sm:mt-0 font-normal">Curated Luxury Stays • Verified Reservations • Seamless Experience</p>
        </div>
      </div>
    </footer>
  );
};

