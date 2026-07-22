'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
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
  Search,
  FileText,
  TrendingUp,
  Star,
} from 'lucide-react';
import { useTradeStore, useJournalStore } from '@/lib/store';

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const trades = useTradeStore((s) => s.trades);
  const journalEntries = useJournalStore((s) => s.entries);

  const toggle = useCallback(() => {
    setOpen((o) => !o);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [toggle]);

  const navigate = (path: string) => {
    router.push(path);
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Command Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="fixed left-1/2 top-[20%] z-[101] -translate-x-1/2 w-full max-w-[560px]"
          >
            <Command className="glass-strong rounded-2xl overflow-hidden shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-5 border-b border-white/[0.06]">
                <Search className="w-4 h-4 text-foreground-subtle flex-shrink-0" />
                <Command.Input
                  placeholder="Search trades, pages, actions..."
                  className="w-full py-4 bg-transparent text-[15px] text-foreground placeholder:text-foreground-subtle/50 outline-none"
                />
              </div>

              {/* Results */}
              <Command.List className="max-h-[360px] overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-foreground-subtle">
                  No results found.
                </Command.Empty>

                {/* Pages */}
                <Command.Group heading="Pages" className="mb-2">
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-foreground-subtle/50">
                    Pages
                  </p>
                  {[
                    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
                    { label: 'All Trades', icon: ListOrdered, href: '/trades' },
                    { label: 'Add New Trade', icon: Plus, href: '/trades/new' },
                    { label: 'Journal', icon: BookOpen, href: '/journal' },
                    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
                    { label: 'Psychology', icon: Brain, href: '/psychology' },
                    { label: 'Calendar', icon: CalendarDays, href: '/calendar' },
                    { label: 'Goals', icon: Target, href: '/goals' },
                    { label: 'Settings', icon: Settings, href: '/settings' },
                  ].map((page) => (
                    <Command.Item
                      key={page.href}
                      value={page.label}
                      onSelect={() => navigate(page.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-muted cursor-pointer transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground"
                    >
                      <page.icon className="w-4 h-4" />
                      {page.label}
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Quick Actions */}
                <Command.Group>
                  <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-foreground-subtle/50">
                    Quick Actions
                  </p>
                  <Command.Item
                    value="New Trade"
                    onSelect={() => navigate('/trades/new')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-muted cursor-pointer transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground"
                  >
                    <Plus className="w-4 h-4" />
                    Log New Trade
                  </Command.Item>
                  <Command.Item
                    value="New Journal Entry"
                    onSelect={() => navigate('/journal')}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-muted cursor-pointer transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground"
                  >
                    <FileText className="w-4 h-4" />
                    Write Journal Entry
                  </Command.Item>
                </Command.Group>

                {/* Recent Trades */}
                {trades.length > 0 && (
                  <Command.Group>
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-foreground-subtle/50">
                      Recent Trades
                    </p>
                    {trades.slice(0, 5).map((trade) => (
                      <Command.Item
                        key={trade.id}
                        value={`${trade.pair} ${trade.strategy} ${trade.direction} ${trade.notes} ${trade.tags.join(' ')}`}
                        onSelect={() => navigate(`/trades/${trade.id}`)}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-muted cursor-pointer transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground"
                      >
                        <TrendingUp className="w-4 h-4" />
                        <span>{trade.pair}</span>
                        <span className="text-[10px] text-foreground-subtle">({trade.strategy})</span>
                        <span className={`ml-auto text-xs font-medium ${trade.pnl > 0 ? 'text-profit' : trade.pnl < 0 ? 'text-loss' : 'text-gray-400'}`}>
                          {trade.pnl > 0 ? '+$' : trade.pnl < 0 ? '-$' : '$'}{Math.abs(trade.pnl).toFixed(2)}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {/* Journal Entries */}
                {journalEntries.length > 0 && (
                  <Command.Group>
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-foreground-subtle/50">
                      Journal Notes
                    </p>
                    {journalEntries.slice(0, 5).map((entry) => (
                      <Command.Item
                        key={entry.id}
                        value={`${entry.title} ${entry.content} ${entry.tags.join(' ')}`}
                        onSelect={() => navigate('/journal')}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground-muted cursor-pointer transition-colors data-[selected=true]:bg-white/[0.06] data-[selected=true]:text-foreground"
                      >
                        <BookOpen className="w-4 h-4 text-accent-blue" />
                        <span>{entry.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-white/[0.06] text-[11px] text-foreground-subtle/50">
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-secondary rounded text-[10px] border border-border">↑↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-secondary rounded text-[10px] border border-border">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-secondary rounded text-[10px] border border-border">Esc</kbd>
                  Close
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
