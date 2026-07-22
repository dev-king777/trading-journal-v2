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
  ChevronRight,
  Search,
  Command,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { useSettingsStore } from '@/lib/store';

const navItems = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Trades', href: '/trades', icon: ListOrdered },
  { label: 'Add Trade', href: '/trades/new', icon: Plus, badge: 'NEW' },
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

    // Global keyboard shortcut listener (Ctrl+B or Cmd+B) to toggle floating sidebar
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  if (!mounted) return null;

  return (
    <motion.aside
      initial={false}
      animate={{
        width: sidebarCollapsed ? 68 : 260,
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-3 top-3 bottom-3 z-50 flex flex-col rounded-2xl border border-white/[0.08] bg-[#09090b]/95 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden"
      style={{ boxShadow: '0 0 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.04)' }}
    >
      {/* ─── Header / Brand ─── */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/[0.06] shrink-0">
        <button
          onClick={toggleSidebar}
          className="relative flex-shrink-0 group cursor-pointer focus:outline-none"
          title="Toggle Navigation (Ctrl+B)"
        >
          <div className="w-9 h-9 rounded-xl bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center transition-transform group-hover:scale-105">
            <Sparkles className="w-4 h-4 text-accent-blue animate-pulse" />
          </div>
          <div className="absolute -inset-1 rounded-xl bg-accent-blue/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity" />
        </button>

        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between w-full overflow-hidden whitespace-nowrap"
            >
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-tight text-foreground font-sans flex items-center gap-1.5">
                  draga<span className="text-accent-blue">4life</span>
                </span>
                <span className="text-[9px] font-semibold tracking-wider uppercase text-foreground-subtle/60">
                  Trading Journal
                </span>
              </div>
              <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-accent-blue/10 text-accent-blue border border-accent-blue/20">
                PRO
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ─── Search Button Trigger ─── */}
      <div className="px-2.5 mt-3 mb-1">
        <button
          className={`w-full flex items-center gap-2.5 rounded-xl text-foreground-subtle text-xs transition-all ${
            sidebarCollapsed
              ? 'p-2.5 justify-center hover:bg-white/[0.06] hover:text-foreground'
              : 'px-3 py-2 bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] hover:text-foreground'
          }`}
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', metaKey: true });
            document.dispatchEvent(event);
          }}
          title={sidebarCollapsed ? 'Search (Cmd+K)' : undefined}
        >
          <Search className="w-4 h-4 flex-shrink-0 text-foreground-subtle" />
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-between w-full font-medium"
              >
                <span>Quick Search...</span>
                <kbd className="flex items-center gap-0.5 px-1.5 py-0.5 bg-black/40 rounded text-[9px] font-mono text-foreground-subtle border border-white/10">
                  <Command className="w-2.5 h-2.5" />K
                </kbd>
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* ─── Upper Menu ─── */}
      <nav className="flex-1 px-2.5 py-2 space-y-1 overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-2 mb-2 text-[10px] font-bold uppercase tracking-widest text-foreground-subtle/50"
            >
              Navigation
            </motion.p>
          )}
        </AnimatePresence>

        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link key={item.href} href={item.href} className="block relative group">
              <div
                className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  sidebarCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2.5'
                } ${
                  isActive
                    ? 'bg-accent-blue/10 text-accent-blue font-semibold border border-accent-blue/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                    : 'text-foreground-subtle hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                {/* Active left indicator bar */}
                {isActive && (
                  <motion.div
                    layoutId="active-nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-accent-blue rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                  />
                )}

                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-accent-blue' : ''}`} />

                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-xs font-medium overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Badge if available */}
                {item.badge && !sidebarCollapsed && (
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                    {item.badge}
                  </span>
                )}

                {/* Floating Tooltip in Collapsed Mode */}
                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-[#141416] text-foreground text-xs font-semibold whitespace-nowrap border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50 flex items-center gap-1.5">
                    <span>{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-accent-blue" />}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* ─── Lower Menu & Profile ─── */}
      <div className="mt-auto px-2.5 py-2.5 border-t border-white/[0.06] space-y-2 shrink-0 bg-black/20">
        {bottomItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="block relative group">
              <div
                className={`relative flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  sidebarCollapsed ? 'p-2.5 justify-center' : 'px-3 py-2'
                } ${
                  isActive
                    ? 'bg-accent-blue/10 text-accent-blue font-semibold border border-accent-blue/20'
                    : 'text-foreground-subtle hover:text-foreground hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-accent-blue' : ''}`} />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-medium overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {sidebarCollapsed && (
                  <div className="absolute left-full ml-3 px-3 py-1.5 rounded-lg bg-[#141416] text-foreground text-xs font-semibold whitespace-nowrap border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50">
                    {item.label}
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {/* ─── User Profile Avatar Card ─── */}
        <div className="relative group">
          <div
            className={`flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 transition-all ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-blue/20 to-accent-purple/30 border border-accent-blue/30 flex items-center justify-center text-accent-blue font-bold text-xs">
                DT
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-black" />
            </div>

            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex flex-col overflow-hidden whitespace-nowrap"
                >
                  <span className="text-xs font-bold text-foreground flex items-center gap-1">
                    Draga Trader <ShieldCheck className="w-3 h-3 text-accent-blue" />
                  </span>
                  <span className="text-[9px] text-foreground-subtle/70 font-mono">
                    ICT / SMC Trader
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {sidebarCollapsed && (
            <div className="absolute left-full ml-3 px-3 py-2 rounded-xl bg-[#141416] text-foreground border border-white/10 shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 z-50 flex flex-col gap-0.5 whitespace-nowrap">
              <span className="text-xs font-bold text-accent-blue">Draga Trader</span>
              <span className="text-[10px] text-foreground-subtle">ICT / SMC Pro</span>
            </div>
          )}
        </div>

        {/* ─── Collapse Toggle Button ─── */}
        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center gap-2.5 rounded-xl py-2 px-3 text-foreground-subtle hover:text-foreground hover:bg-white/[0.05] transition-all border border-transparent ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <div className="flex items-center gap-2">
            {sidebarCollapsed ? (
              <ChevronRight className="w-4 h-4 text-accent-blue" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-accent-blue" />
            )}
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium whitespace-nowrap"
                >
                  Collapse Sidebar
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {!sidebarCollapsed && (
            <kbd className="px-1.5 py-0.5 bg-black/40 rounded text-[9px] font-mono text-foreground-subtle border border-white/10">
              Ctrl+B
            </kbd>
          )}
        </button>
      </div>
    </motion.aside>
  );
}
