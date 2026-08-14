'use client';

import AppLayout from '@/components/layout/AppLayout';
import LotSizeCalculator from '@/components/LotSizeCalculator';
import { motion } from 'framer-motion';
import { Coins } from 'lucide-react';

export default function CalculatorPage() {
  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto space-y-6">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
              <Coins className="w-6 h-6" />
            </div>
            Position Size Calculator
          </h2>
          <p className="text-foreground-subtle mt-2">
            Calculate your exact XAUUSD lot size based on account balance, risk percentage, and stop loss distance.
          </p>
        </motion.div>

        {/* Calculator */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <LotSizeCalculator className="w-full" />
        </motion.div>
      </div>
    </AppLayout>
  );
}
