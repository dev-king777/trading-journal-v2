'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Plus,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Target,
  Settings,
  ListOrdered,
  ChevronLeft,
  Search,
  Command,
  Sparkles,
} from 'lucide-react';
import { useSettingsStore } from '@/lib/store';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Trades', href: '/trades', icon: ListOrdered },
  { label: 'Add Trade', href: '/trades/new', icon: Plus },
  { label: 'Journal', href: '/journal', icon: BookOpen },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Psychology', href: '/psychology', icon: Brain },
  { label: 'Calendar', href: '/calendar', icon: CalendarDays },
  { label: 'Goals', href: '/goals', icon: Target },
];

const bottomItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar } = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border-subtle bg-card/50 backdrop-blur-xl"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-border-subtle">
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 rounded-lg gradient-blue flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="absolute -inset-1 rounded-lg gradient-blue opacity-20 blur-md" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-[15px] font-bold tracking-tight bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
                draga4life
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search trigger */}
      <div className="px-3 mt-4 mb-2">
        <button
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-foreground-subtle text-sm hover:bg-white/[0.04] transition-colors"
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between w-full"
              >
                <span>Search...</span>
                <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary rounded text-[10px] font-medium text-foreground-subtle border border-border">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-foreground-subtle/50"
            >
              Menu
            </motion.p>
          )}
        </AnimatePresence>
        {navItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isActive && item.href === '/trades/new' && !sidebarCollapsed && (
                  <motion.div
                    layoutId="nav-badge"
                    className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold gradient-blue text-white"
                  >
                    NEW
                  </motion.div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-border-subtle space-y-1">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <div className={`sidebar-item ${isActive ? 'active' : ''}`}>
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className="sidebar-item w-full justify-center"
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
            transition={{ duration: 0.3 }}
          >
            <ChevronLeft className="w-[18px] h-[18px]" />
          </motion.div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
