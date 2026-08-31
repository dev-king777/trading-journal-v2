'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Loader2, RefreshCw, WalletCards } from 'lucide-react';
import { useFundedNextStore } from '@/lib/store';

export default function FundedNextAccountSwitcher() {
  const { accounts, account, selectedAccountNumber, isSyncing, selectAccount, sync } = useFundedNextStore();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  if (!account || !selectedAccountNumber) return null;

  const handleSelect = async (accountNumber: string) => {
    if (accountNumber === selectedAccountNumber) {
      setOpen(false);
      return;
    }
    setOpen(false);
    await selectAccount(accountNumber);
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="min-h-11 max-w-40 sm:max-w-52 flex items-center gap-1.5 sm:gap-2 rounded-lg border border-border-subtle bg-card px-2 sm:px-2.5 text-left hover:border-accent-blue/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <WalletCards className="h-4 w-4 shrink-0 text-accent-blue" aria-hidden="true" />
        <span className="min-w-0 block">
          <span className="block truncate text-[11px] font-semibold text-foreground">{account.accountNumber}</span>
          <span className="hidden sm:block truncate text-[10px] text-foreground-subtle">${account.balance.toLocaleString()}</span>
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-foreground-subtle transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-lg border border-border-subtle bg-card p-2 shadow-2xl" role="listbox" aria-label="Switch FundedNext account">
          <div className="flex items-center justify-between px-2 py-2">
            <p className="text-xs font-semibold text-foreground">Trading accounts</p>
            <button
              type="button"
              onClick={() => sync()}
              disabled={isSyncing}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-foreground-subtle hover:text-foreground hover:bg-white/5 disabled:opacity-50"
              aria-label="Sync current FundedNext account"
              title="Sync current account"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </button>
          </div>

          <div className="space-y-1">
            {accounts.map((candidate) => {
              const selected = candidate.accountNumber === selectedAccountNumber;
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={selected}
                  key={`${candidate.providerAccountId}-${candidate.accountNumber}`}
                  onClick={() => handleSelect(candidate.accountNumber)}
                  disabled={selected}
                  className={`w-full min-h-14 rounded-md px-3 py-2 flex items-center gap-3 text-left transition-colors disabled:opacity-50 ${selected ? 'bg-accent-blue/10' : 'hover:bg-white/5'}`}
                >
                  <span className="h-8 w-8 rounded-md border border-border-subtle flex items-center justify-center text-accent-blue shrink-0">
                    <WalletCards className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-foreground">{candidate.accountType}</span>
                    <span className="block text-[11px] text-foreground-subtle">{candidate.accountNumber} · ${candidate.balance.toLocaleString()}</span>
                  </span>
                  {selected && <Check className="h-4 w-4 text-profit" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
