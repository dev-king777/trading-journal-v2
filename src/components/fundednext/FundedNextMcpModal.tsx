'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Key, RefreshCw, ExternalLink, Sparkles, CheckCircle2 } from 'lucide-react';
import { useFundedNextStore } from '@/lib/store';

interface FundedNextMcpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FundedNextMcpModal({ isOpen, onClose }: FundedNextMcpModalProps) {
  const { token, connect, isSyncing } = useFundedNextStore();
  const [inputToken, setInputToken] = useState(token || '');

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await connect(inputToken);
    if (success) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="w-full max-w-lg bg-[#0F0F12] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Top Gradient Background */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-indigo-600/20 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-foreground-subtle hover:text-foreground hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600/20 to-indigo-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                Connect FundedNext MCP
                <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  LIVE MCP
                </span>
              </h2>
              <p className="text-xs text-foreground-subtle mt-0.5">
                Connect your FundedNext prop account in under two minutes
              </p>
            </div>
          </div>

          {/* Step Guide matching FundedNext UI */}
          <div className="space-y-3 mb-6 bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                1
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Log into your{' '}
                <a
                  href="https://dashboard.fundednext.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 underline font-semibold inline-flex items-center gap-1 hover:text-blue-300"
                >
                  FundedNext Dashboard <ExternalLink className="w-3 h-3" />
                </a>{' '}
                and click <strong className="text-white">Connect with AI</strong>.
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                2
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Generate your one-time token and copy the MCP Server URL (<code className="bg-black/50 px-1 py-0.5 rounded text-blue-300">https://mcp.fundednext.com</code>).
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                3
              </div>
              <p className="text-xs text-foreground/80 leading-relaxed">
                Paste your token below to auto-sync live performance, payout status & trades.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleConnect} className="space-y-4 relative z-10">
            <div>
              <label className="block text-xs font-semibold text-foreground-subtle uppercase tracking-wider mb-2">
                FundedNext One-Time MCP Token
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-foreground-subtle absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  placeholder="Paste your FundedNext token here..."
                  className="w-full h-12 bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 text-sm text-white focus:border-blue-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 bg-white/5 hover:bg-white/10 text-foreground-subtle font-semibold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSyncing}
                className="flex-1 h-11 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
              >
                {isSyncing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Connecting MCP...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Connect MCP Server
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Footer security note */}
          <div className="mt-5 pt-4 border-t border-white/[0.06] text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-foreground-subtle">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Secured JSON-RPC 2.0 end-to-end encryption over https://mcp.fundednext.com
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
