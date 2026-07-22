'use client';

import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Plus, X, Download, Upload, Trash2, Archive, Star,
  Edit2, ChevronRight, FileDown, Eye, CheckSquare, Square, Sparkles
} from 'lucide-react';
import { useTradeStore } from '@/lib/store';
import { MARKETS, DIRECTIONS, TRADE_RESULTS, Market, Direction, Session, Timeframe, Emotion, Trade } from '@/lib/types';
import TradeCard from '@/components/trades/TradeCard';
import DragaAiLogger from './DragaAiLogger';
import Link from 'next/link';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

const PAGE_SIZE = 12;

export default function TradesListContent() {
  const {
    trades, bulkDelete, deleteAllTrades, bulkArchive, bulkEdit
  } = useTradeStore();

  const [search, setSearch] = useState('');
  const [marketFilter, setMarketFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'pnl' | 'rr'>('date');
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  // Bulk Edit Modal
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showDragaModal, setShowDragaModal] = useState(false);
  const [bulkStrategy, setBulkStrategy] = useState('');
  const [bulkMarket, setBulkMarket] = useState('');

  // Hidden File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter & Sort Trades
  const filteredTrades = useMemo(() => {
    let result = trades.filter((t) => !t.isArchived);

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.pair.toLowerCase().includes(q) ||
          t.strategy.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }

    if (marketFilter) result = result.filter((t) => t.market === marketFilter);
    if (directionFilter) result = result.filter((t) => t.direction === directionFilter);
    if (resultFilter) result = result.filter((t) => t.result === resultFilter);

    result.sort((a, b) => {
      switch (sortBy) {
        case 'pnl': return b.pnl - a.pnl;
        case 'rr': return b.rrRatio - a.rrRatio;
        default: return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

    return result;
  }, [trades, search, marketFilter, directionFilter, resultFilter, sortBy]);

  const displayedTrades = useMemo(() => {
    return filteredTrades.slice(0, visibleCount);
  }, [filteredTrades, visibleCount]);

  const activeFilterCount = [marketFilter, directionFilter, resultFilter].filter(Boolean).length;

  const handleSelectTrade = (id: string) => {
    setSelectedIds(curr =>
      curr.includes(id) ? curr.filter(item => item !== id) : [...curr, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === displayedTrades.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(displayedTrades.map(t => t.id));
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedIds([]);
  };

  // CSV EXPORT
  const handleCSVExport = () => {
    if (filteredTrades.length === 0) {
      toast.error('No trades to export');
      return;
    }
    const headers = [
      'Pair', 'Market', 'Direction', 'Result', 'Entry Price', 'Exit Price',
      'Stop Loss', 'Take Profit', 'Size', 'PnL', 'RR', 'Session', 'Strategy', 'Date', 'Notes', 'Tags'
    ];
    const rows = filteredTrades.map(t => [
      t.pair, t.market, t.direction, t.result, t.entryPrice, t.exitPrice,
      t.stopLoss, t.takeProfit, t.positionSize, t.pnl, t.rrRatio, t.session,
      t.strategy, t.date, t.notes.replace(/"/g, '""'), t.tags.join(';')
    ]);
    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `trading-journal-export-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Trades exported to CSV successfully!');
  };

  // PDF EXPORT
  const handlePDFExport = () => {
    if (filteredTrades.length === 0) {
      toast.error('No trades to export');
      return;
    }
    try {
      const doc = new jsPDF();
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(9, 9, 11);
      doc.text('Trading Journal Report', 14, 20);

      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(113, 113, 122);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 26);

      const total = filteredTrades.length;
      const wins = filteredTrades.filter(t => t.result === 'Win').length;
      const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';
      const totalPnl = filteredTrades.reduce((sum, t) => sum + t.pnl, 0).toFixed(2);

      doc.setFillColor(244, 244, 245);
      doc.rect(14, 32, 182, 22, 'F');
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(9, 9, 11);
      doc.text(`Total Trades: ${total}`, 20, 46);
      doc.text(`Win Rate: ${winRate}%`, 80, 46);
      doc.text(`Net P&L: $${totalPnl}`, 140, 46);

      doc.setFontSize(13);
      doc.text('Trade History', 14, 66);

      let y = 74;
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('Date', 14, y);
      doc.text('Pair', 40, y);
      doc.text('Dir', 65, y);
      doc.text('Market', 80, y);
      doc.text('Strategy', 110, y);
      doc.text('R:R', 145, y);
      doc.text('P&L ($)', 165, y);

      doc.setDrawColor(228, 228, 231);
      doc.line(14, y + 2, 196, y + 2);

      y += 8;
      doc.setFont('Helvetica', 'normal');
      filteredTrades.slice(0, 20).forEach((t) => {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        const tradeDate = new Date(t.date).toLocaleDateString();
        doc.text(tradeDate, 14, y);
        doc.text(t.pair, 40, y);
        doc.text(t.direction, 65, y);
        doc.text(t.market, 80, y);
        doc.text(t.strategy.substring(0, 18), 110, y);
        doc.text(`${t.rrRatio}R`, 145, y);
        doc.setTextColor(t.pnl > 0 ? 34 : t.pnl < 0 ? 239 : 156, t.pnl > 0 ? 197 : t.pnl < 0 ? 68 : 163, t.pnl > 0 ? 94 : t.pnl < 0 ? 68 : 175);
        doc.text(`${t.pnl > 0 ? '+$' : t.pnl < 0 ? '-$' : '$'}${Math.abs(t.pnl).toFixed(2)}`, 165, y);
        doc.setTextColor(9, 9, 11);
        y += 8;
      });

      if (filteredTrades.length > 20) {
        doc.setFont('Helvetica', 'italic');
        doc.text(`... and ${filteredTrades.length - 20} more trades.`, 14, y + 2);
      }

      doc.save(`trading-journal-report-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('Report saved successfully!');
    } catch (err: any) {
      toast.error(`PDF generation failed: ${err.message}`);
    }
  };

  // CSV IMPORT
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let text = await file.text();
      // Remove BOM if present
      if (text.charCodeAt(0) === 0xFEFF) {
        text = text.slice(1);
      }

      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV is empty or missing data rows');

      // Auto-detect delimiter (, ; \t)
      const firstLine = lines[0];
      const commaCount = (firstLine.match(/,/g) || []).length;
      const semiCount = (firstLine.match(/;/g) || []).length;
      const tabCount = (firstLine.match(/\t/g) || []).length;

      let delimiter = ',';
      if (semiCount > commaCount && semiCount > tabCount) delimiter = ';';
      else if (tabCount > commaCount && tabCount > semiCount) delimiter = '\t';

      const parseCSVRow = (row: string) => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delimiter && !inQuotes) {
            result.push(current);
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current);
        return result;
      };

      const rawHeaders = parseCSVRow(lines[0]);
      const headers = rawHeaders.map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

      const getFieldValue = (rowMap: Record<string, string>, aliases: string[]): string => {
        for (const alias of aliases) {
          if (rowMap[alias] !== undefined && rowMap[alias] !== '') {
            return rowMap[alias];
          }
        }
        return '';
      };

      const parsedTrades = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVRow(lines[i]).map(v => v.trim().replace(/^"|"$/g, ''));
        const rowMap: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowMap[header] = values[index] || '';
        });

        // Field aliases matching standard broker & trading journal CSV exports
        const rawPair = getFieldValue(rowMap, ['pair', 'symbol', 'ticker', 'instrument', 'asset', 'item', 'currency', 'trade', 'contract', 'symbol/pair']);
        const rawDirection = getFieldValue(rowMap, ['direction', 'side', 'type', 'action', 'buy/sell', 'order type', 'ordertype', 'b/s']);
        const rawMarket = getFieldValue(rowMap, ['market', 'asset class', 'market type', 'category']);
        const rawEntry = getFieldValue(rowMap, ['entry price', 'entry_price', 'entry', 'open price', 'open_price', 'open', 'price', 'buy price', 'sell price', 'execution price', 'avg price', 'avg open', 'fill price']);
        const rawExit = getFieldValue(rowMap, ['exit price', 'exit_price', 'exit', 'close price', 'close_price', 'close', 'avg close', 'settle price']);
        const rawSL = getFieldValue(rowMap, ['stop loss', 'stop_loss', 'sl', 'stop', 's/l', 'stop price']);
        const rawTP = getFieldValue(rowMap, ['take profit', 'take_profit', 'tp', 'target', 't/p', 'limit']);
        const rawSize = getFieldValue(rowMap, ['size', 'position_size', 'position size', 'lots', 'volume', 'qty', 'quantity', 'amount', 'contracts', 'shares']);
        const rawFees = getFieldValue(rowMap, ['commission', 'comm', 'fees', 'fee', 'total fee']);
        const rawSwap = getFieldValue(rowMap, ['swap', 'rollover']);
        const rawPnL = getFieldValue(rowMap, ['profit', 'pnl', 'p&l', 'net profit', 'realized pnl', 'realized_pnl', 'net pnl', 'profit/loss', 'profit / loss', 'closed pnl', 'gross pnl']);
        const rawStrategy = getFieldValue(rowMap, ['strategy', 'setup', 'model', 'system', 'tag', 'playbook']);
        const rawDate = getFieldValue(rowMap, ['date', 'time', 'open time', 'opentime', 'close time', 'timestamp', 'date/time', 'date time', 'created_at', 'created at']);
        const rawNotes = getFieldValue(rowMap, ['notes', 'note', 'comment', 'description', 'remarks', 'reason']);
        const rawTags = getFieldValue(rowMap, ['tags', 'tag', 'labels', 'categories']);

        const pair = rawPair ? rawPair.toUpperCase().replace('/', '') : 'EURUSD';

        // Direction Normalization
        let direction: Direction = 'Long';
        const dirClean = rawDirection.toUpperCase();
        if (dirClean.includes('SELL') || dirClean.includes('SHORT') || dirClean === 'S' || dirClean === '-1') {
          direction = 'Short';
        } else if (dirClean.includes('BUY') || dirClean.includes('LONG') || dirClean === 'B' || dirClean === '1') {
          direction = 'Long';
        }

        // Market Detection
        let market: Market = (rawMarket as Market) || 'Forex';
        if (!rawMarket) {
          const p = pair.toUpperCase();
          if (p.includes('XAU') || p.includes('XAG') || p.includes('GOLD') || p.includes('SILVER') || p.includes('OIL')) {
            market = 'Commodities';
          } else if (p.includes('BTC') || p.includes('ETH') || p.includes('SOL') || p.includes('USDT')) {
            market = 'Crypto';
          } else if (p.includes('NAS') || p.includes('SPX') || p.includes('US30') || p.includes('GER') || p.includes('DAX')) {
            market = 'Indices';
          }
        }

        let entryPrice = parseFloat(rawEntry.replace(/,/g, '')) || 0;
        let exitPrice = parseFloat(rawExit.replace(/,/g, '')) || 0;
        const stopLoss = parseFloat(rawSL.replace(/,/g, '')) || 0;
        const takeProfit = parseFloat(rawTP.replace(/,/g, '')) || 0;
        const positionSize = parseFloat(rawSize.replace(/,/g, '')) || 0.1;
        const fees = parseFloat(rawFees.replace(/,/g, '')) || 0;
        const swap = parseFloat(rawSwap.replace(/,/g, '')) || 0;

        const profitNum = rawPnL !== '' ? parseFloat(rawPnL.replace(/,/g, '')) : undefined;
        let parsedPnl = undefined;
        if (profitNum !== undefined) {
          parsedPnl = Number((profitNum + fees + swap).toFixed(2));
        }

        if (entryPrice === 0 && exitPrice > 0) entryPrice = exitPrice;
        if (entryPrice === 0 && exitPrice === 0) entryPrice = 1.0;

        // Date Parsing
        let date = new Date().toISOString();
        if (rawDate) {
          const parsedTimestamp = Date.parse(rawDate);
          if (!isNaN(parsedTimestamp)) {
            date = new Date(parsedTimestamp).toISOString();
          }
        }

        const strategy = rawStrategy || 'CSV Import';
        const notes = rawNotes;
        const tags = rawTags ? rawTags.split(/[;,]/).map(t => t.trim()).filter(Boolean) : ['CSV Import'];

        parsedTrades.push({
          pair, market, direction, entryPrice, exitPrice, stopLoss, takeProfit,
          positionSize, riskPercent: 1, rewardPercent: 2, fees, pnl: parsedPnl,
          session: 'London' as Session, strategy, setup: `${pair} ${direction} ${strategy}`, timeframe: '15m' as Timeframe,
          date, duration: '', rating: 3, emotionBefore: 'Calm' as Emotion,
          emotionDuring: 'Calm' as Emotion, emotionAfter: 'Calm' as Emotion,
          confidenceLevel: 5, isMistake: false, lessonsLearned: '',
          screenshotUrl: '', tradingViewLink: '', notes, tags, isFavorite: false, isArchived: false
        });
      }

      if (parsedTrades.length === 0) throw new Error('No valid trade rows found in the CSV file');

      // Add trades to store
      for (const t of parsedTrades) {
        await useTradeStore.getState().addTrade(t);
      }
      toast.success(`Successfully imported ${parsedTrades.length} trades from CSV!`);
      setVisibleCount(PAGE_SIZE);
    } catch (err: any) {
      toast.error(`CSV Import Error: ${err.message}`);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  // Bulk Operations Actions
  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete the ${selectedIds.length} selected trades?`)) {
      await bulkDelete(selectedIds);
      toast.success(`${selectedIds.length} trades deleted`);
      setSelectedIds([]);
    }
  };

  const handleBulkArchive = async () => {
    await bulkArchive(selectedIds, true);
    toast.success(`${selectedIds.length} trades archived`);
    setSelectedIds([]);
  };

  const handleBulkFavorite = async () => {
    await bulkEdit(selectedIds, { isFavorite: true });
    toast.success(`${selectedIds.length} trades marked as favorites`);
    setSelectedIds([]);
  };

  const handleApplyBulkEdit = async () => {
    const updates: Partial<Trade> = {};
    if (bulkStrategy) updates.strategy = bulkStrategy;
    if (bulkMarket) updates.market = bulkMarket as Market;

    if (Object.keys(updates).length > 0) {
      await bulkEdit(selectedIds, updates);
      toast.success('Selected trades updated');
    }
    setShowBulkEditModal(false);
    setBulkStrategy('');
    setBulkMarket('');
    setSelectedIds([]);
  };

  const handleDeleteAllTrades = async () => {
    if (trades.length === 0) {
      toast.info('No trades to delete');
      return;
    }
    if (window.confirm(`Are you sure you want to PERMANENTLY delete all ${trades.length} trades? This action cannot be undone.`)) {
      await deleteAllTrades();
      toast.success('All trades have been deleted');
    }
  };

  return (
    <div className="max-w-[1440px] mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Trades</h2>
          <p className="text-foreground-subtle mt-1">
            {filteredTrades.length} trade{filteredTrades.length !== 1 ? 's' : ''} logged
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Hidden Import file input */}
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleCSVImport}
            className="hidden"
          />

          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary" title="Import CSV">
            <Upload className="w-4 h-4" />
            <span className="hidden md:inline">Import CSV</span>
          </button>

          <button onClick={handleCSVExport} className="btn-secondary" title="Export CSV">
            <Download className="w-4 h-4" />
            <span className="hidden md:inline">CSV</span>
          </button>

          <button onClick={handlePDFExport} className="btn-secondary" title="Export Report PDF">
            <FileDown className="w-4 h-4" />
            <span className="hidden md:inline">PDF</span>
          </button>

          <button
            onClick={() => setShowDragaModal(true)}
            className="btn-secondary border-yellow-500/20 hover:border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/5"
            title="Log with Draga AI"
          >
            <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
            <span>Log with Draga</span>
          </button>

          <button
            onClick={handleDeleteAllTrades}
            className="btn-secondary border-red-500/20 hover:border-red-500/50 text-red-400 hover:bg-red-500/10"
            title="Delete All Trades"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
            <span className="hidden sm:inline">Delete All</span>
          </button>

          <Link href="/trades/new" className="btn-primary">
            <Plus className="w-4 h-4" />
            New Trade
          </Link>
        </div>
      </motion.div>

      {/* Filter / Bulk Command row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-3"
      >
        <div className="flex items-center gap-3">
          {/* Selection mode toggle */}
          <button
            onClick={toggleSelectionMode}
            className={`btn-secondary ${selectionMode ? 'border-accent-blue/40 text-accent-blue' : ''}`}
            title="Bulk Select"
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span className="hidden md:inline">{selectionMode ? 'Cancel Select' : 'Select'}</span>
          </button>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
            <input
              type="text"
              placeholder="Search trades by pair, strategy, notes, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary relative ${showFilters ? 'border-accent-blue/40 text-accent-blue' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full gradient-blue text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="input-field w-auto pr-8 appearance-none cursor-pointer"
            style={{ backgroundImage: 'none' }}
          >
            <option value="date">Newest</option>
            <option value="pnl">Highest P&L</option>
            <option value="rr">Best R:R</option>
          </select>
        </div>

        {/* Filter Pills */}
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2 p-4 rounded-xl bg-card border border-border-subtle"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-subtle font-medium">Market:</span>
              {MARKETS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMarketFilter(marketFilter === m ? '' : m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    marketFilter === m
                      ? 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30'
                      : 'bg-white/[0.03] text-foreground-subtle hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="w-full" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-subtle font-medium">Direction:</span>
              {DIRECTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => setDirectionFilter(directionFilter === d ? '' : d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    directionFilter === d
                      ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30'
                      : 'bg-white/[0.03] text-foreground-subtle hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="w-full" />

            <div className="flex items-center gap-2">
              <span className="text-xs text-foreground-subtle font-medium">Result:</span>
              {TRADE_RESULTS.map((r) => (
                <button
                  key={r}
                  onClick={() => setResultFilter(resultFilter === r ? '' : r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    resultFilter === r
                      ? r === 'Win' ? 'bg-profit/20 text-profit border border-profit/30'
                        : r === 'Loss' ? 'bg-loss/20 text-loss border border-loss/30'
                        : 'bg-breakeven/20 text-breakeven border border-breakeven/30'
                      : 'bg-white/[0.03] text-foreground-subtle hover:bg-white/[0.06] border border-transparent'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {activeFilterCount > 0 && (
              <>
                <div className="w-full" />
                <button
                  onClick={() => {
                    setMarketFilter('');
                    setDirectionFilter('');
                    setResultFilter('');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-loss hover:bg-loss/10 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              </>
            )}
          </motion.div>
        )}
      </motion.div>

      {/* Floating Selection Bar */}
      <AnimatePresence>
        {selectionMode && selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-6 py-4 rounded-2xl bg-card border border-accent-blue/30 shadow-2xl backdrop-blur-md"
          >
            <span className="text-sm font-semibold text-foreground">
              {selectedIds.length} trade{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <div className="w-px h-5 bg-border-subtle" />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                {selectedIds.length === displayedTrades.length ? 'Deselect All' : 'Select All'}
              </button>
              <button
                onClick={handleBulkFavorite}
                className="btn-secondary py-1.5 px-3 text-xs text-yellow-500 hover:bg-yellow-500/10 hover:border-yellow-500/20"
              >
                <Star className="w-3.5 h-3.5 fill-current" /> Favorite
              </button>
              <button
                onClick={handleBulkArchive}
                className="btn-secondary py-1.5 px-3 text-xs text-accent-purple hover:bg-accent-purple/10 hover:border-accent-purple/20"
              >
                <Archive className="w-3.5 h-3.5" /> Archive
              </button>
              <button
                onClick={() => setShowBulkEditModal(true)}
                className="btn-secondary py-1.5 px-3 text-xs text-accent-blue hover:bg-accent-blue/10 hover:border-accent-blue/20"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={handleBulkDelete}
                className="btn-secondary py-1.5 px-3 text-xs text-loss hover:bg-loss/10 hover:border-loss/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
            <button
              onClick={() => setSelectedIds([])}
              className="p-1 rounded-full text-foreground-subtle hover:bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Edit Modal popup */}
      {showBulkEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border-subtle p-6 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground">Bulk Edit ({selectedIds.length} trades)</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-foreground-subtle mb-1">Update Strategy</label>
                <input
                  type="text"
                  placeholder="Strategy name"
                  value={bulkStrategy}
                  onChange={(e) => setBulkStrategy(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-foreground-subtle mb-1">Update Market</label>
                <select
                  value={bulkMarket}
                  onChange={(e) => setBulkMarket(e.target.value)}
                  className="input-field cursor-pointer"
                >
                  <option value="">Select market</option>
                  {MARKETS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setShowBulkEditModal(false)} className="btn-secondary py-1.5">Cancel</button>
              <button onClick={handleApplyBulkEdit} className="btn-primary py-1.5">Apply Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Cards Grid */}
      {displayedTrades.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayedTrades.map((trade, i) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                index={i}
                isSelected={selectedIds.includes(trade.id)}
                onSelect={handleSelectTrade}
                selectionMode={selectionMode}
              />
            ))}
          </div>

          {/* Load More pagination button */}
          {filteredTrades.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="btn-secondary group flex items-center gap-1"
              >
                <span>Load More Trades</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
            <Search className="w-7 h-7 text-foreground-subtle/40" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">No trades found</h3>
          <p className="text-sm text-foreground-subtle max-w-sm">
            {search || activeFilterCount > 0
              ? 'Try adjusting your search or filters.'
              : 'Start logging your trades to see them here.'}
          </p>
          {!search && activeFilterCount === 0 && (
            <Link href="/trades/new" className="btn-primary mt-4">
              <Plus className="w-4 h-4" />
              Log Your First Trade
            </Link>
          )}
        </motion.div>
      )}
      {/* Draga AI Logger Agent Modal */}
      <DragaAiLogger isOpen={showDragaModal} onClose={() => setShowDragaModal(false)} />
    </div>
  );
}
