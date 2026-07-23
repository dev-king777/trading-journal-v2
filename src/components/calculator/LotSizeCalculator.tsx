'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  DollarSign,
  Percent,
  Copy,
  Check,
  RotateCcw,
  Coins,
  ArrowDownUp,
} from 'lucide-react';
import { toast } from 'sonner';

export interface LotSizeCalculatorProps {
  initialAccountBalance?: number;
  initialRiskPercentage?: number;
  initialEntryPrice?: number;
  initialStopLossPrice?: number;
  className?: string;
}

const BALANCE_STORAGE_KEY = 'xauusd_calculator_account_balance';

export default function LotSizeCalculator({
  initialAccountBalance = 10000,
  initialRiskPercentage = 1,
  initialEntryPrice = 2400,
  initialStopLossPrice = 2390,
  className = '',
}: LotSizeCalculatorProps) {
  // Input States
  const [accountBalance, setAccountBalance] = useState<string>(initialAccountBalance.toString());
  const [riskPercentage, setRiskPercentage] = useState<string>(initialRiskPercentage.toString());
  const [entryPrice, setEntryPrice] = useState<string>(initialEntryPrice.toString());
  const [stopLossPrice, setStopLossPrice] = useState<string>(initialStopLossPrice.toString());
  const [copied, setCopied] = useState<boolean>(false);

  // 1. Persist & Load Account Balance from localStorage
  useEffect(() => {
    try {
      const savedBalance = localStorage.getItem(BALANCE_STORAGE_KEY);
      if (savedBalance !== null && savedBalance.trim() !== '') {
        setAccountBalance(savedBalance);
      }
    } catch (e) {
      console.error('Failed to load saved balance from localStorage:', e);
    }
  }, []);

  const handleBalanceChange = (value: string) => {
    setAccountBalance(value);
    try {
      localStorage.setItem(BALANCE_STORAGE_KEY, value);
    } catch (e) {
      console.error('Failed to save balance to localStorage:', e);
    }
  };

  // Parse numeric values safely
  const balanceNum = parseFloat(accountBalance) || 0;
  const riskPercentNum = parseFloat(riskPercentage) || 0;
  const entryPriceNum = parseFloat(entryPrice) || 0;
  const stopLossPriceNum = parseFloat(stopLossPrice) || 0;

  // 1. Calculate Risk Amount = accountBalance * (riskPercentage / 100)
  const riskAmount = useMemo(() => {
    if (balanceNum <= 0 || riskPercentNum <= 0) return 0;
    return balanceNum * (riskPercentNum / 100);
  }, [balanceNum, riskPercentNum]);

  // 2. Calculate Price Difference = Math.abs(entryPrice - stopLossPrice)
  const priceDifference = useMemo(() => {
    if (entryPriceNum <= 0 || stopLossPriceNum <= 0) return 0;
    return Math.abs(entryPriceNum - stopLossPriceNum);
  }, [entryPriceNum, stopLossPriceNum]);

  // 3. Calculate Risk Per Lot (Gold = 100oz contract) = Difference * 100
  const riskPerLot = useMemo(() => {
    return priceDifference * 100;
  }, [priceDifference]);

  // 4. Final Lot Size = Risk Amount / Risk Per Lot
  const lotSize = useMemo(() => {
    if (riskPerLot <= 0 || isNaN(riskPerLot) || riskAmount <= 0) return 0;
    return riskAmount / riskPerLot;
  }, [riskAmount, riskPerLot]);

  const formattedLotSize = lotSize > 0 ? lotSize.toFixed(2) : '0.00';
  const pipsDifference = (priceDifference * 10).toFixed(1); // 1.00 USD = 10 pips/points in Gold

  // Trade direction helper
  const tradeDirection = useMemo(() => {
    if (entryPriceNum === 0 || stopLossPriceNum === 0 || entryPriceNum === stopLossPriceNum) {
      return null;
    }
    return entryPriceNum > stopLossPriceNum ? 'Long (Buy)' : 'Short (Sell)';
  }, [entryPriceNum, stopLossPriceNum]);

  // Quick preset handlers
  const setPresetRisk = (risk: number) => {
    setRiskPercentage(risk.toString());
  };

  const setPresetBalance = (balance: number) => {
    handleBalanceChange(balance.toString());
  };

  const handleReset = () => {
    const defaultBal = initialAccountBalance.toString();
    handleBalanceChange(defaultBal);
    setRiskPercentage(initialRiskPercentage.toString());
    setEntryPrice(initialEntryPrice.toString());
    setStopLossPrice(initialStopLossPrice.toString());
    toast.info('Calculator reset to default values');
  };

  const handleCopyLotSize = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(formattedLotSize);
      setCopied(true);
      toast.success(`Copied ${formattedLotSize} Lots to clipboard!`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={`w-full max-w-5xl mx-auto rounded-2xl bg-card border border-border-subtle p-5 sm:p-6 md:p-8 shadow-xl ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-5 mb-5 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500">
            <Coins className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight flex flex-wrap items-center gap-2">
              XAUUSD Position Size Calculator
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                100 oz / Lot
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-foreground-subtle mt-0.5">
              Calculate exact lot sizes for Gold based on your risk parameters
            </p>
          </div>
        </div>

        <button
          onClick={handleReset}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-xs font-medium text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors shrink-0"
          title="Reset to initial values"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {/* 2-Column Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 xl:gap-8 items-stretch">
        {/* Left Side: Input Form (xl:col-span-7) */}
        <div className="xl:col-span-7 flex flex-col justify-between space-y-4 sm:space-y-5">
          {/* Instrument (Read-only locked) */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
              Instrument
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                readOnly
                value="XAUUSD - Gold Spot"
                className="w-full bg-neutral-950/60 border border-neutral-800/80 rounded-xl py-3 pl-4 pr-10 text-sm text-neutral-300 font-medium cursor-not-allowed select-none focus:outline-none"
              />
              <div className="absolute right-3 text-neutral-500 flex items-center gap-1.5 text-xs bg-neutral-900/80 px-2 py-1 rounded-md border border-neutral-800">
                <Lock className="w-3.5 h-3.5 text-blue-500" />
                <span>Locked</span>
              </div>
            </div>
          </div>

          {/* Account Balance */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
                Account Balance ($)
              </label>
              <div className="flex items-center gap-1">
                {[1000, 5000, 10000, 25000, 50000].map((bal) => (
                  <button
                    key={bal}
                    type="button"
                    onClick={() => setPresetBalance(bal)}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                      balanceNum === bal
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    ${bal >= 1000 ? `${bal / 1000}k` : bal}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="0"
                step="any"
                value={accountBalance}
                onChange={(e) => handleBalanceChange(e.target.value)}
                placeholder="10000"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white font-medium focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Risk Percentage */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                Risk Percentage (%)
                {riskAmount > 0 && (
                  <span className="text-blue-400 normal-case font-medium text-xs">
                    (${riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                  </span>
                )}
              </label>
              <div className="flex items-center gap-1">
                {[0.5, 1, 1.5, 2, 3].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setPresetRisk(r)}
                    className={`text-[11px] px-2 py-0.5 rounded-md transition-colors ${
                      riskPercentNum === r
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    {r}%
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500">
                <Percent className="w-4 h-4" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(e.target.value)}
                placeholder="1.0"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-sm text-white font-medium focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Entry & Stop Loss Prices Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Entry Price */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Entry Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="2400.00"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white font-medium focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>

            {/* Stop Loss Price */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                Stop Loss Price ($)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={stopLossPrice}
                onChange={(e) => setStopLossPrice(e.target.value)}
                placeholder="2390.00"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-sm text-white font-medium focus:border-blue-500 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Distance Info Pill */}
          {tradeDirection && priceDifference > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80 text-xs">
              <span className="text-neutral-400 flex items-center gap-1.5">
                <ArrowDownUp className="w-3.5 h-3.5 text-blue-500" />
                Direction: <strong className="text-white">{tradeDirection}</strong>
              </span>
              <span className="text-neutral-300">
                SL Distance: <strong className="text-blue-400">${priceDifference.toFixed(2)}</strong> ({pipsDifference} pips)
              </span>
            </div>
          )}
        </div>

        {/* Right Side: Display Card (xl:col-span-5) */}
        <div className="xl:col-span-5 flex flex-col">
          <div className="relative overflow-hidden h-full rounded-2xl bg-neutral-950/80 border border-neutral-800 p-6 flex flex-col justify-between shadow-xl">
            {/* Subtle Blue Background Glow */}
            <div className="absolute -top-16 -right-16 w-52 h-52 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

            {/* Top Label & Badge */}
            <div className="relative z-10 flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                Calculated Position
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                Live Result
              </span>
            </div>

            {/* Big Prominent Lot Size Display */}
            <div className="relative z-10 my-auto py-6 text-center">
              <p className="text-xs font-medium text-neutral-400 uppercase tracking-widest mb-1">
                Recommended Lot Size
              </p>
              <motion.div
                key={formattedLotSize}
                initial={{ scale: 0.95, opacity: 0.8 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="text-6xl sm:text-7xl font-black text-blue-500 tracking-tight drop-shadow-[0_4px_20px_rgba(59,130,246,0.2)]"
              >
                {formattedLotSize}
              </motion.div>
              <p className="text-sm font-semibold text-neutral-300 mt-2">
                Standard Lots <span className="text-neutral-500 text-xs font-normal">(100 oz / Lot)</span>
              </p>

              {/* Action Button */}
              <button
                type="button"
                onClick={handleCopyLotSize}
                className="mt-6 w-full py-3 px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-500 font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-[0.99]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy Lot Size ({formattedLotSize})
                  </>
                )}
              </button>
            </div>

            {/* Breakdown Metrics Footer */}
            <div className="relative z-10 pt-4 border-t border-neutral-800/80 grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800/60">
                <span className="text-neutral-500 block text-[10px] uppercase font-medium">
                  Risk Amount
                </span>
                <span className="text-white font-semibold text-sm">
                  ${riskAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-neutral-900/90 border border-neutral-800/60">
                <span className="text-neutral-500 block text-[10px] uppercase font-medium">
                  Risk Per 1.00 Lot
                </span>
                <span className="text-white font-semibold text-sm">
                  ${riskPerLot.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
