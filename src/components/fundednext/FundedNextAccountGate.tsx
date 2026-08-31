'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ChartNoAxesCombined,
  CheckCircle2,
  CircleDollarSign,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';
import { useFundedNextStore } from '@/lib/store';

export default function FundedNextAccountGate() {
  const {
    token,
    accounts,
    isSyncing,
    hasLoadedAccounts,
    lastError,
    connect,
    selectAccount,
  } = useFundedNextStore();
  const [openingAccount, setOpeningAccount] = useState<string | null>(null);
  const [connectionToken, setConnectionToken] = useState(token);

  const handleSelect = async (accountNumber: string) => {
    setOpeningAccount(accountNumber);
    const success = await selectAccount(accountNumber);
    if (!success) setOpeningAccount(null);
  };

  const showLoading = accounts.length === 0 && (isSyncing || (Boolean(token) && !hasLoadedAccounts));

  return (
    <main className="min-h-dvh bg-background text-foreground px-4 py-8 sm:px-8 flex items-center justify-center">
      <div className="w-full max-w-5xl">
        <motion.header
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 sm:mb-10"
        >
          <div className="flex items-center gap-3 mb-7">
            <div className="h-10 w-10 rounded-lg border border-accent-blue/30 bg-accent-blue/10 text-accent-blue flex items-center justify-center">
              <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">draga <span className="text-accent-blue">4life</span></p>
              <p className="text-[11px] text-foreground-subtle">Trading Journal</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-profit mb-3">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {token ? 'FundedNext MCP connected' : 'FundedNext cached accounts ready'}
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold text-foreground">Choose your trading account</h1>
          <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-foreground-subtle">
            Your dashboard, payout progress and trade history will load automatically for the account you open.
          </p>
        </motion.header>

        {showLoading ? (
          <div className="min-h-56 rounded-lg border border-border-subtle bg-card flex flex-col items-center justify-center text-center px-6" role="status">
            <Loader2 className="h-7 w-7 animate-spin text-accent-blue" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold">Loading your FundedNext accounts</p>
            <p className="mt-1 text-xs text-foreground-subtle">Secure sync is running in the background.</p>
          </div>
        ) : (lastError || !token) && accounts.length === 0 ? (
          <div className="min-h-56 rounded-lg border border-red-500/20 bg-red-500/[0.04] flex flex-col items-center justify-center text-center px-6" role="alert">
            <p className="text-sm font-semibold text-red-300">
              {lastError || 'Add your FundedNext MCP token to load your accounts.'}
            </p>
            <form
              className="mt-5 w-full max-w-lg"
              onSubmit={(event) => {
                event.preventDefault();
                connect(connectionToken);
              }}
            >
              <label htmlFor="fundednext-reconnect-token" className="block text-left text-xs font-medium text-foreground-subtle mb-2">
                New FundedNext MCP token
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" aria-hidden="true" />
                  <input
                    id="fundednext-reconnect-token"
                    type="password"
                    value={connectionToken}
                    onChange={(event) => setConnectionToken(event.target.value)}
                    autoComplete="off"
                    className="min-h-11 w-full rounded-lg border border-border-subtle bg-background pl-10 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent-blue"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!connectionToken.trim()}
                  className="min-h-11 px-4 rounded-lg bg-accent-blue text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  Reconnect
                </button>
              </div>
            </form>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4" aria-label="FundedNext accounts">
            {accounts.map((account, index) => {
              const isOpening = openingAccount === account.accountNumber;
              const profit = account.balance - account.initialBalance;
              const statusColor = account.status === 'Breached'
                ? 'text-red-300 bg-red-500/10 border-red-500/20'
                : 'text-profit bg-profit/10 border-profit/20';

              return (
                <motion.button
                  type="button"
                  key={`${account.providerAccountId}-${account.accountNumber}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                  onClick={() => handleSelect(account.accountNumber)}
                  disabled={isOpening}
                  className="group min-h-64 rounded-lg border border-border-subtle bg-card p-5 sm:p-6 text-left hover:border-accent-blue/50 hover:bg-white/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue disabled:cursor-wait disabled:opacity-70 transition-colors"
                  aria-label={`Open FundedNext account ${account.accountNumber}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="h-11 w-11 rounded-lg bg-accent-blue/10 border border-accent-blue/20 text-accent-blue flex items-center justify-center">
                      <WalletCards className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold ${statusColor}`}>
                      {account.status}
                    </span>
                  </div>

                  <div className="mt-5">
                    <p className="text-base font-semibold text-foreground group-hover:text-accent-blue transition-colors">
                      {account.accountType}
                    </p>
                    <p className="mt-1 text-xs font-mono text-foreground-subtle">Account {account.accountNumber}</p>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border-subtle pt-4">
                    <div>
                      <p className="text-[11px] text-foreground-subtle">Balance</p>
                      <p className="mt-1 text-lg font-bold tabular-nums">${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-foreground-subtle">Current P&amp;L</p>
                      <p className={`mt-1 text-lg font-bold tabular-nums ${profit >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {profit >= 0 ? '+' : '-'}${Math.abs(profit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between text-sm font-semibold text-accent-blue">
                    <span className="flex items-center gap-2">
                      {isOpening ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      {isOpening ? 'Syncing account' : 'Open dashboard'}
                    </span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </div>
                </motion.button>
              );
            })}
          </section>
        )}

        <div className="mt-6 flex items-center gap-2 text-xs text-foreground-subtle">
          <CircleDollarSign className="h-4 w-4 text-profit" aria-hidden="true" />
          Trades are imported automatically and kept separate by account.
        </div>
      </div>
    </main>
  );
}
