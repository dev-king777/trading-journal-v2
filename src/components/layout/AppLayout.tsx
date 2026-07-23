'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import FloatingActionButton from './FloatingActionButton';
import CommandPalette from './CommandPalette';
import SplashScreen from './SplashScreen';
import { useSettingsStore, initializeAllStores, subscribeToRealtime, isSupabaseConfigured } from '@/lib/store';
import { Toaster } from 'sonner';
import { Database, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/trades': 'Trades',
  '/trades/new': 'Add Trade',
  '/journal': 'Journal',
  '/analytics': 'Analytics',
  '/psychology': 'Psychology',
  '/calendar': 'Calendar',
  '/goals': 'Goals',
  '/settings': 'Settings',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const settings = useSettingsStore((s) => s.settings);
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeAllStores();
    const unsubscribe = subscribeToRealtime();

    const splashShown = sessionStorage.getItem('splash-shown');
    if (splashShown) {
      setShowSplash(false);
    }

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (unsubscribe) unsubscribe();
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Update theme dynamically
  useEffect(() => {
    if (!mounted) return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (settings.theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme, mounted]);

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false);
    sessionStorage.setItem('splash-shown', 'true');
  }, []);

  const handleLogout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
      window.location.href = '/login';
    }
  };

  if (pathname === '/login') {
    return (
      <div className="min-h-screen bg-background">
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#111113',
              border: '1px solid #27272A',
              color: '#FAFAFA',
              borderRadius: '12px',
            },
          }}
        />
        {children}
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-lg gradient-blue animate-pulse" />
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  const pageTitle = pageTitles[pathname] || 'Trade Detail';

  return (
    <div className="min-h-screen bg-background relative">
      <Sidebar />
      <CommandPalette />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#111113',
            border: '1px solid #27272A',
            color: '#FAFAFA',
            borderRadius: '12px',
          },
        }}
      />

      <motion.main
        initial={false}
        animate={{
          marginLeft: isMobile ? 0 : (sidebarCollapsed ? 80 : 274),
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="min-h-screen pb-20 md:pb-0"
      >
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 sm:px-8 border-b border-border-subtle bg-background/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <h1 className="text-base sm:text-lg font-semibold text-foreground">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Connection Indicator */}
            {isSupabaseConfigured ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-profit/10 border border-profit/20 text-profit text-xs font-semibold">
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Supabase Cloud</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-semibold">
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Offline Mode</span>
              </div>
            )}

            {/* Logout Button */}
            {isSupabaseConfigured && (
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg text-foreground-subtle hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}

            {/* Search button */}
            <button
              onClick={() => {
                const event = new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: true,
                  bubbles: true,
                });
                document.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-foreground-subtle hover:text-foreground hover:bg-white/[0.04] transition-colors"
            >
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 bg-secondary rounded text-[10px] font-medium border border-border">
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="p-4 sm:p-8"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.main>

      <FloatingActionButton />
      <BottomNav />
    </div>
  );
}
