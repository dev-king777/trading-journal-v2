'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, TrendingUp, Plus, BookOpen, Coins } from 'lucide-react';

const navItems = [
  { label: 'Home', href: '/', icon: LayoutDashboard },
  { label: 'Trades', href: '/trades', icon: TrendingUp },
  { label: 'Add', href: '/trades/new', icon: Plus, isAction: true },
  { label: 'Calculator', href: '/calculator', icon: Coins },
  { label: 'Journal', href: '/journal', icon: BookOpen },
];

export default function BottomNav() {
  const pathname = usePathname();

  // Don't show bottom nav on login page
  if (pathname === '/login') return null;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 bg-background/95 backdrop-blur-xl border-t border-border-subtle pointer-events-none">
      <nav className="pointer-events-auto max-w-md mx-auto h-16 flex items-center justify-around px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.isAction) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="min-w-14 min-h-14 flex flex-col items-center justify-center -mt-5 group"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-600/30 transition-all group-active:scale-95 border-2 border-background">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] font-semibold text-blue-400 mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`min-w-14 min-h-14 flex flex-col items-center justify-center py-1 px-1.5 rounded-lg transition-all ${
                isActive
                  ? 'text-blue-500 font-semibold'
                  : 'text-foreground-subtle hover:text-foreground'
              }`}
            >
              <Icon className={`w-4.5 h-4.5 sm:w-5 sm:h-5 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-[9px] sm:text-[10px] mt-1 font-medium leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
