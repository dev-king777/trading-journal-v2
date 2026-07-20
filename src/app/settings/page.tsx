'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings as SettingsIcon, Moon, Sun, DollarSign, Download, Upload, Palette, Database, Globe, Key } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useSettingsStore, isSupabaseConfigured } from '@/lib/store';
import { toast } from 'sonner';
import { MARKETS, TIMEFRAMES } from '@/lib/types';

export default function SettingsPage() {
  const { settings, updateSettings } = useSettingsStore();

  const [dbUrl, setDbUrl] = useState(settings.supabaseUrl || '');
  const [dbKey, setDbKey] = useState(settings.supabaseAnonKey || '');

  const handleExport = () => {
    const data = {
      trades: localStorage.getItem('trading-journal-trades'),
      entries: localStorage.getItem('trading-journal-entries'),
      settings: localStorage.getItem('trading-journal-settings'),
      goals: localStorage.getItem('trading-journal-goals'),
      habits: localStorage.getItem('trading-journal-habits'),
      moods: localStorage.getItem('trading-journal-moods'),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading-journal-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup data exported successfully!');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.trades) localStorage.setItem('trading-journal-trades', data.trades);
        if (data.entries) localStorage.setItem('trading-journal-entries', data.entries);
        if (data.settings) localStorage.setItem('trading-journal-settings', data.settings);
        if (data.goals) localStorage.setItem('trading-journal-goals', data.goals);
        if (data.habits) localStorage.setItem('trading-journal-habits', data.habits);
        if (data.moods) localStorage.setItem('trading-journal-moods', data.moods);
        toast.success('Backup data imported successfully! Page reloading...');
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        toast.error('Invalid backup JSON file');
      }
    };
    input.click();
  };

  const handleConnectDb = () => {
    updateSettings({
      supabaseUrl: dbUrl.trim(),
      supabaseAnonKey: dbKey.trim(),
    });
    toast.success('Database credentials saved. Reloading to connect...');
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleDisconnectDb = () => {
    if (window.confirm('Disconnect from Supabase? The app will return to Offline Local Storage Mode.')) {
      updateSettings({
        supabaseUrl: '',
        supabaseAnonKey: '',
      });
      setDbUrl('');
      setDbKey('');
      toast.success('Database credentials cleared. Reloading...');
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-[700px] mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Settings</h2>
          <p className="text-foreground-subtle mt-1">Configure parameters, themes, and database syncing</p>
        </motion.div>

        {/* Supabase Database Connection */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-2xl bg-card border border-border-subtle p-6 space-y-5"
        >
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-accent-blue" />
            Supabase Connection
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-foreground-subtle mb-1">Supabase Project URL</label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={dbUrl}
                onChange={(e) => setDbUrl(e.target.value)}
                className="input-field text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-foreground-subtle mb-1">Supabase Anon Key</label>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={dbKey}
                onChange={(e) => setDbKey(e.target.value)}
                className="input-field text-sm font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              {isSupabaseConfigured && (
                <button onClick={handleDisconnectDb} className="btn-secondary text-loss hover:bg-loss/10 text-xs">
                  Disconnect
                </button>
              )}
              <button onClick={handleConnectDb} className="btn-primary text-xs">
                Save & Connect Database
              </button>
            </div>
          </div>
        </motion.div>

        {/* Appearance */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border-subtle p-6 space-y-5"
        >
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent-purple" />
            Appearance
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Theme</p>
              <p className="text-xs text-foreground-subtle mt-0.5">Choose your preferred theme</p>
            </div>
            <div className="flex gap-2">
              {(['dark', 'light', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                    settings.theme === theme
                      ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30'
                      : 'bg-white/[0.03] text-foreground-subtle border border-transparent hover:bg-white/[0.06]'
                  }`}
                >
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> : theme === 'light' ? <Sun className="w-3.5 h-3.5" /> : <SettingsIcon className="w-3.5 h-3.5" />}
                  {theme}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Trading & Localization Preferences */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="rounded-2xl bg-card border border-border-subtle p-6 space-y-5"
        >
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-accent-purple" />
            Trading & Localization
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Currency</p>
                <p className="text-xs text-foreground-subtle mt-0.5">Display currency symbol</p>
              </div>
              <select
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value })}
                className="input-field w-28 text-sm"
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Timezone</p>
                <p className="text-xs text-foreground-subtle mt-0.5">Application execution timezone</p>
              </div>
              <select
                value={settings.timezone}
                onChange={(e) => updateSettings({ timezone: e.target.value })}
                className="input-field w-40 text-sm"
              >
                <option value="UTC">UTC</option>
                <option value="America/New_York">New York (EST)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Language</p>
                <p className="text-xs text-foreground-subtle mt-0.5">Application localized language</p>
              </div>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className="input-field w-28 text-sm"
              >
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="es">Español</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Default Market</p>
                <p className="text-xs text-foreground-subtle mt-0.5">Pre-selected market for new trades</p>
              </div>
              <select
                value={settings.defaultMarket}
                onChange={(e) => updateSettings({ defaultMarket: e.target.value as any })}
                className="input-field w-28 text-sm"
              >
                {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Default Timeframe</p>
                <p className="text-xs text-foreground-subtle mt-0.5">Pre-selected timeframe</p>
              </div>
              <select
                value={settings.defaultTimeframe}
                onChange={(e) => updateSettings({ defaultTimeframe: e.target.value as any })}
                className="input-field w-28 text-sm"
              >
                {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Default Risk per Trade</p>
                <p className="text-xs text-foreground-subtle mt-0.5">Maximum risk percentage</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="10"
                  value={settings.riskPerTrade}
                  onChange={(e) => updateSettings({ riskPerTrade: parseFloat(e.target.value) || 1 })}
                  className="input-field w-20 text-sm text-center"
                />
                <span className="text-sm text-foreground-subtle">%</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Data Management */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border-subtle p-6 space-y-5"
        >
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-accent-emerald" />
            Data Backup & Restore
          </h3>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Export Data Backup</p>
              <p className="text-xs text-foreground-subtle mt-0.5">Download all your records as a single JSON file</p>
            </div>
            <button onClick={handleExport} className="btn-secondary text-sm py-2">
              <Download className="w-3.5 h-3.5" /> Export Backup
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">Restore Data Backup</p>
              <p className="text-xs text-foreground-subtle mt-0.5">Upload a previously exported backup file</p>
            </div>
            <button onClick={handleImport} className="btn-secondary text-sm py-2">
              <Upload className="w-3.5 h-3.5" /> Restore Backup
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground text-loss">Clear All Local Data</p>
              <p className="text-xs text-foreground-subtle mt-0.5">Permanently wipe all local storage journal details</p>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all local storage data? This cannot be undone.')) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="btn-secondary text-sm py-2 text-loss hover:bg-loss/10 hover:border-loss/30"
            >
              Clear Local
            </button>
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
