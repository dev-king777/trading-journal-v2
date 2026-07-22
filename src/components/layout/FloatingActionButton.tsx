'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, TrendingUp, Brain, X } from 'lucide-react';

const actions = [
  { label: 'New Trade', icon: TrendingUp, href: '/trades/new', color: '#EAB308', textColor: '#000000' },
  { label: 'Journal Entry', icon: BookOpen, href: '/journal', color: '#18181B', textColor: '#FAFAFA' },
  { label: 'Mood Check', icon: Brain, href: '/psychology', color: '#18181B', textColor: '#FAFAFA' },
];

export default function FloatingActionButton() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col-reverse items-end gap-3">
      {/* Main FAB - Gold/Yellow Theme Accent */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setExpanded((e) => !e)}
        className="relative w-14 h-14 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black flex items-center justify-center shadow-lg shadow-yellow-500/20 border border-yellow-400/50 cursor-pointer transition-colors"
      >
        <motion.div
          animate={{ rotate: expanded ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {expanded ? (
            <X className="w-6 h-6 text-black" />
          ) : (
            <Plus className="w-6 h-6 text-black" />
          )}
        </motion.div>
      </motion.button>

      {/* Expanded Actions */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-2"
          >
            {actions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                transition={{ delay: i * 0.05, duration: 0.2 }}
              >
                <Link
                  href={action.href}
                  onClick={() => setExpanded(false)}
                  className="flex items-center gap-3 group"
                >
                  <span className="px-3 py-1.5 rounded-lg bg-neutral-900/90 border border-neutral-800 text-xs font-semibold text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl">
                    {action.label}
                  </span>
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg border border-white/10 transition-transform hover:scale-105"
                    style={{ background: action.color, color: action.textColor }}
                  >
                    <action.icon className="w-5 h-5" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
