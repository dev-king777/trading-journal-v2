'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState<'loading' | 'exit'>('loading');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('exit'), 2800);
    const t2 = setTimeout(() => onComplete(), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== 'exit' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#09090B] overflow-hidden"
        >
          {/* Logo container */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1, ease: [0.34, 1.56, 0.64, 1] }}
            className="relative z-10 mb-8"
          >
            <div className="w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border border-yellow-500/20 shadow-2xl relative"
              style={{ boxShadow: '0 0 50px rgba(234, 179, 8, 0.15)' }}
            >
              <img
                src="/logo.jpg"
                alt="draga4life logo"
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          {/* Loading bar */}
          <motion.div
            className="relative z-10 w-48 h-1 rounded-full bg-white/5 overflow-hidden"
          >
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600"
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.6, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
