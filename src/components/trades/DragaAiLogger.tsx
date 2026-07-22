'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Upload, X, Check, Save, Cpu, BrainCircuit, Activity,
  AlertTriangle, RefreshCw, Image, SlidersHorizontal, TrendingUp, TrendingDown, ShieldAlert
} from 'lucide-react';
import { useTradeStore, isSupabaseConfigured, supabase } from '@/lib/store';
import { toast } from 'sonner';
import { Market, Direction, Session, Timeframe } from '@/lib/types';
import { calculateXAUUSDPnl } from '@/lib/utils';

interface DragaAiLoggerProps {
  isOpen: boolean;
  onClose: () => void;
}

const VALID_DIRECTIONS: Direction[] = ['Long', 'Short'];
const VALID_SESSIONS: Session[] = ['Asian', 'London', 'New York', 'Sydney', 'Overlap'];
const VALID_TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily', 'Weekly', 'Monthly'];
const VALID_MARKETS: Market[] = ['Forex', 'Crypto', 'Stocks', 'Indices', 'Commodities', 'Futures', 'Options'];

// ─── Image Compression (canvas downscale → JPEG 0.6) ───
// Reduces payload by ~95%, drastically speeding up API calls
function compressBase64Image(
  base64: string,
  maxDim = 800,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64); // fallback to original on error
    img.src = base64;
  });
}

export default function DragaAiLogger({ isOpen, onClose }: DragaAiLoggerProps) {
  const addTrade = useTradeStore((s) => s.addTrade);

  // ─── Dual image states ───
  const [chartImage, setChartImage] = useState<string | null>(null);
  const [chartImageDisplay, setChartImageDisplay] = useState<string | null>(null);
  const [detailsImage, setDetailsImage] = useState<string | null>(null);
  const [detailsImagePreview, setDetailsImagePreview] = useState<string | null>(null);

  const [scanStep, setScanStep] = useState<'upload' | 'scanning' | 'review' | 'error'>('upload');
  const [progressLogs, setProgressLogs] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const chartFileRef = useRef<HTMLInputElement>(null);
  const detailsFileRef = useRef<HTMLInputElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // ─── Risk management inputs (stored as strings for safe decimal typing) ───
  const [accountBalanceStr, setAccountBalanceStr] = useState('6000');
  const [riskPercentStr, setRiskPercentStr] = useState('1');

  // ─── Trade form states ───
  const [pair, setPair] = useState('XAUUSD');
  const [market, setMarket] = useState<Market>('Commodities');
  const [direction, setDirection] = useState<Direction>('Long');
  const [entryPrice, setEntryPrice] = useState<number | null>(null);
  const [exitPrice, setExitPrice] = useState<number | null>(null);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  const [takeProfit, setTakeProfit] = useState<number | null>(null);
  const [positionSize, setPositionSize] = useState<string>('0.01');
  const [fees] = useState(0.00);
  const [strategy, setStrategy] = useState('');
  const [notes, setNotes] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [session, setSession] = useState<Session>('New York');

  // ─── Vision AI analysis states ───
  const [tradeGrade, setTradeGrade] = useState('');
  const [setupConfidence, setSetupConfidence] = useState(0);
  const [overallConfidence, setOverallConfidence] = useState(0);
  const [aiCommentary, setAiCommentary] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dynamicTitle, setDynamicTitle] = useState('');
  const [strengths, setStrengths] = useState<string[]>([]);
  const [weaknesses, setWeaknesses] = useState<string[]>([]);
  const [confluences, setConfluences] = useState<string[]>([]);
  const [riskReward, setRiskReward] = useState<string | null>(null);
  const [suggestedLotSize, setSuggestedLotSize] = useState(false);

  // ─── Live P&L calculation ───
  const calculatedPnl = useMemo(() => {
    if (entryPrice == null || exitPrice == null) return null;
    return calculateXAUUSDPnl(direction, entryPrice, exitPrice, positionSize);
  }, [direction, entryPrice, exitPrice, positionSize]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setChartImage(null);
      setChartImageDisplay(null);
      setDetailsImage(null);
      setDetailsImagePreview(null);
      setScanStep('upload');
      setProgressLogs([]);
      setErrorMessage('');
      setPair('XAUUSD');
      setMarket('Commodities');
      setDirection('Long');
      setEntryPrice(null);
      setExitPrice(null);
      setStopLoss(null);
      setTakeProfit(null);
      setPositionSize('0.01');
      setStrategy('');
      setNotes('');
      setTimeframe('15m');
      setSession('New York');
      setTradeGrade('');
      setSetupConfidence(0);
      setOverallConfidence(0);
      setAiCommentary('');
      setTags([]);
      setDynamicTitle('');
      setStrengths([]);
      setWeaknesses([]);
      setConfluences([]);
      setRiskReward(null);
      setSuggestedLotSize(false);
      setAccountBalanceStr('6000');
      setRiskPercentStr('1');
    }
  }, [isOpen]);

  // ─── Clipboard Paste Handler (Ctrl+V) ───
  useEffect(() => {
    if (!isOpen || scanStep !== 'upload') return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;

          // Route to the first empty slot
          if (!chartImage) {
            processChartFile(file);
            toast.success('Image 1 (Chart) pasted from clipboard');
          } else if (!detailsImage) {
            processDetailsFile(file);
            toast.success('Image 2 (Position) pasted from clipboard');
          } else {
            toast.info('Both image slots are filled. Clear one to paste again.');
          }
          break; // Only process the first image from the clipboard
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  // We intentionally track chartImage and detailsImage to route pastes correctly
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, scanStep, chartImage, detailsImage]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [progressLogs]);

  const addLog = (msg: string) => {
    setProgressLogs((prev) => [...prev, `[Draga AI]: ${msg}`]);
  };

  // ─── File processors ───
  const processChartFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setChartImage(base64);
      setChartImageDisplay(base64);
    };
    reader.readAsDataURL(file);

    // Supabase upload for permanent URL
    if (isSupabaseConfigured) {
      try {
        const ext = file.name.split('.').pop();
        const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        supabase.storage
          .from('screenshots')
          .upload(`screenshots/${name}`, file)
          .then((res: { error: unknown }) => {
            if (!res.error) {
              const { data: { publicUrl } } = supabase.storage
                .from('screenshots')
                .getPublicUrl(`screenshots/${name}`);
              setChartImageDisplay(publicUrl);
            }
          });
      } catch (err) {
        console.error('Supabase upload failed:', err);
      }
    }
  };

  const processDetailsFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setDetailsImage(base64);
      setDetailsImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // ─── Launch analysis ───
  const handleAnalyze = () => {
    if (!chartImage) {
      toast.error('Please upload the chart screenshot (Image 1).');
      return;
    }
    if (!detailsImage) {
      toast.error('Please upload the position details screenshot (Image 2).');
      return;
    }
    setScanStep('scanning');
    runAIPipeline();
  };

  const runAIPipeline = async () => {
    setProgressLogs([]);
    setErrorMessage('');
    addLog('Initializing Draga AI Dual-Image Pipeline...');
    addLog('Connecting to OpenRouter API...');

    try {
      addLog('Compressing images for faster upload...');
      const [compressedChart, compressedDetails] = await Promise.all([
        compressBase64Image(chartImage!),
        compressBase64Image(detailsImage!),
      ]);
      addLog('✓ Images compressed (800px, JPEG 60%)');
      addLog('Uploading to Vision AI...');

      const requestBody: Record<string, unknown> = {
        chartImage: compressedChart,
        detailsImage: compressedDetails,
      };
      const balanceNum = parseFloat(accountBalanceStr);
      const riskNum = parseFloat(riskPercentStr);
      if (!isNaN(balanceNum) && balanceNum > 0) requestBody.accountBalance = balanceNum;
      if (!isNaN(riskNum) && riskNum > 0) requestBody.riskPercent = riskNum;

      const res = await fetch('/api/analyze-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Unknown error' }));

        // ─── GUARDRAIL: Check isValidChart from backend ───
        if (errData.isValidChart === false) {
          addLog('✗ IMAGE REJECTED: Not a valid trading chart');
          toast.error('🚫 This doesn\'t look like a trading chart. Please upload a valid TradingView chart screenshot.', {
            duration: 6000,
          });
          setErrorMessage('The uploaded image is not a financial trading chart. Draga AI only analyzes real TradingView/MT4/MT5 chart screenshots. Please try again with a valid chart image.');
          setTimeout(() => setScanStep('error'), 800);
          return;
        }

        if (errData.setup_required) {
          throw new Error('OpenRouter API key not configured. Add OPENROUTER_API_KEY to .env.local');
        }
        throw new Error(errData.error || `Vision API returned ${res.status}`);
      }

      addLog('Parsing AI response...');
      const data = await res.json();
      console.log('Draga AI Dual-Image Response:', data);

      // ─── GUARDRAIL: Double-check isValidChart on frontend ───
      if (data.isValidChart === false) {
        addLog('✗ IMAGE REJECTED: AI determined this is not a trading chart');
        toast.error('🚫 This image is not a trading chart. Please upload a valid chart screenshot.', {
          duration: 6000,
        });
        setErrorMessage('The uploaded image was not recognized as a financial chart. Please upload a real TradingView chart screenshot.');
        setTimeout(() => setScanStep('error'), 800);
        return;
      }

      // ─── Populate state ───
      if (data.symbol && data.symbol !== 'Unknown') setPair(data.symbol.toUpperCase());
      if (data.direction && VALID_DIRECTIONS.includes(data.direction)) setDirection(data.direction as Direction);
      if (data.timeframe && VALID_TIMEFRAMES.includes(data.timeframe)) setTimeframe(data.timeframe as Timeframe);
      if (data.session && VALID_SESSIONS.includes(data.session)) setSession(data.session as Session);
      if (data.market && VALID_MARKETS.includes(data.market)) setMarket(data.market as Market);

      if (data.entry != null) setEntryPrice(data.entry);
      if (data.exit_price != null) setExitPrice(data.exit_price);
      else if (data.take_profit != null) setExitPrice(data.take_profit);
      if (data.take_profit != null) setTakeProfit(data.take_profit);
      if (data.stop_loss != null) setStopLoss(data.stop_loss);
      if (data.lot_size != null && data.lot_size > 0) setPositionSize(String(data.lot_size));
      if (data.account_size != null && accountBalanceStr === '6000') setAccountBalanceStr(String(data.account_size));

      if (data.setup && data.setup !== 'Unknown') setStrategy(data.setup);
      if (data.trade_grade) setTradeGrade(data.trade_grade);
      if (data.setup_confidence != null) setSetupConfidence(data.setup_confidence);
      if (data.overall_confidence != null) setOverallConfidence(data.overall_confidence);
      if (data.analysis) setAiCommentary(data.analysis);
      if (Array.isArray(data.tags)) setTags(data.tags);
      if (data.dynamic_title) setDynamicTitle(data.dynamic_title);
      if (Array.isArray(data.strengths)) setStrengths(data.strengths);
      if (Array.isArray(data.weaknesses)) setWeaknesses(data.weaknesses);
      if (Array.isArray(data.confluences)) setConfluences(data.confluences);
      if (data.risk_reward) setRiskReward(data.risk_reward);
      if (data.suggested_lot_size) setSuggestedLotSize(true);

      // Build notes
      const notesParts = [
        `[DRAGA AI ANALYSIS]`,
        `Setup: ${data.setup || 'Unknown'} | Grade: ${data.trade_grade || '—'} | Confidence: ${data.overall_confidence || 0}%`,
        '', data.analysis || '',
      ];
      if (data.strengths?.length) notesParts.push(`\nStrengths: ${data.strengths.join(', ')}`);
      if (data.weaknesses?.length) notesParts.push(`Weaknesses: ${data.weaknesses.join(', ')}`);
      if (data.confluences?.length) notesParts.push(`\nConfluences: ${data.confluences.join(' | ')}`);
      setNotes(notesParts.join('\n'));

      // Logs
      addLog(`✓ Symbol: ${data.symbol || 'XAUUSD'}`);
      addLog(`✓ Direction: ${data.direction || '—'} | TF: ${data.timeframe || '—'}`);
      if (data.entry) addLog(`✓ Entry: ${data.entry} (from position modal)`);
      if (data.stop_loss) addLog(`✓ Stop Loss: ${data.stop_loss}`);
      if (data.take_profit) addLog(`✓ Take Profit: ${data.take_profit}`);
      if (data.lot_size) addLog(`✓ Lot Size: ${data.lot_size}${data.suggested_lot_size ? ' (calculated)' : ' (from modal)'}`);
      addLog(`✓ Setup: ${data.setup || 'Unknown'} (${data.setup_confidence || 0}%)`);
      addLog(`✓ Grade: ${data.trade_grade || '—'}`);
      if (data.risk_reward) addLog(`✓ R:R = ${data.risk_reward}`);
      if (data.estimated_profit != null) addLog(`✓ Est. Profit: $${data.estimated_profit}`);
      if (data.estimated_loss != null) addLog(`✓ Est. Loss: $${data.estimated_loss}`);
      addLog('Dual-image pipeline complete.');

      setTimeout(() => setScanStep('review'), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`✗ Pipeline failed: ${message}`);
      console.error('Draga AI Error:', err);
      setErrorMessage(message);
      toast.error('AI analysis failed.');
      setTimeout(() => setScanStep('error'), 1500);
    }
  };

  const handleRetry = () => {
    if (chartImage && detailsImage) {
      setScanStep('scanning');
      runAIPipeline();
    } else {
      setScanStep('upload');
    }
  };

  const handleSave = async (isDraft: boolean) => {
    try {
      // Calculate P&L using the bulletproof formula
      const finalPnl = calculateXAUUSDPnl(
        direction,
        entryPrice ?? 0,
        exitPrice ?? takeProfit ?? 0,
        positionSize
      );

      await addTrade({
        pair: pair.trim().toUpperCase() || 'XAUUSD',
        market,
        direction,
        entryPrice: entryPrice ?? 0,
        exitPrice: exitPrice ?? takeProfit ?? 0,
        stopLoss: stopLoss ?? 0,
        takeProfit: takeProfit ?? 0,
        positionSize: parseFloat(positionSize) || 0.01,
        riskPercent: parseFloat(riskPercentStr) || 1.0,
        rewardPercent: 0,
        fees,
        pnl: finalPnl,
        session,
        strategy: strategy.trim() || 'Manual Entry',
        setup: dynamicTitle || `${pair} ${direction} ${strategy}`.trim(),
        timeframe,
        date: new Date().toISOString(),
        duration: '',
        rating: tradeGrade.includes('A') ? 5 : tradeGrade.includes('B') ? 4 : tradeGrade.includes('C') ? 3 : 2,
        emotionBefore: 'Disciplined',
        emotionDuring: 'Calm',
        emotionAfter: 'Confident',
        confidenceLevel: Math.min(10, Math.max(1, Math.round(overallConfidence / 10))),
        isMistake: false,
        lessonsLearned: 'Analyzed by Draga AI dual-image Vision pipeline.',
        screenshotUrl: chartImageDisplay || '',
        tradingViewLink: '',
        notes: notes.trim(),
        tags: [...new Set(['DragaAI', pair, direction, ...tags])].filter(Boolean),
        isFavorite: false,
        isArchived: isDraft,
      });
      toast.success(isDraft ? 'Trade saved as draft!' : 'Trade logged successfully!');
      onClose();
    } catch {
      toast.error('Failed to log trade');
    }
  };

  // ─── Render helpers ───
  const PriceField = ({ label, value, onChange, color = 'text-foreground' }: {
    label: string; value: number | null; onChange: (v: number | null) => void; color?: string;
  }) => (
    <div className="p-2.5 rounded-lg bg-white/[0.015] border border-white/[0.03]">
      <p className="text-[9px] text-foreground-subtle uppercase tracking-wider mb-0.5">{label}</p>
      <input type="number" step="any" value={value ?? ''} placeholder="—"
        onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
        className={`w-full bg-transparent border-none outline-none font-bold font-sans text-xs ${color} p-0`}
      />
    </div>
  );

  const DropZone = ({ label, description, icon: Icon, preview, onFile, onClear, inputRef, accentColor = 'yellow' }: {
    label: string; description: string; icon: React.ElementType; preview: string | null;
    onFile: (f: File) => void; onClear: () => void; inputRef: React.RefObject<HTMLInputElement | null>; accentColor?: string;
  }) => (
    <div
      className={`relative flex flex-col items-center justify-center py-8 border-2 border-dashed rounded-xl transition-all cursor-pointer ${
        preview
          ? `border-${accentColor}-500/30 bg-${accentColor}-500/[0.02]`
          : `border-white/10 hover:border-${accentColor}-500/40 bg-white/[0.01] hover:bg-white/[0.02]`
      }`}
      onClick={() => !preview && inputRef.current?.click()}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const file = e.dataTransfer.files?.[0];
        if (file?.type.startsWith('image/')) onFile(file);
      }}
      onDragOver={handleDragOver}
    >
      <input type="file" accept="image/*" ref={inputRef} className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      {preview ? (
        <div className="w-full px-3">
          <img src={preview} alt={label} className="w-full h-24 object-cover rounded-lg border border-white/[0.06]" />
          <div className="flex items-center justify-center gap-2 mt-2">
            <p className="text-[10px] text-green-400 font-bold flex items-center gap-1">
              <Check className="w-3 h-3" /> {label} uploaded
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={`w-10 h-10 rounded-full bg-${accentColor}-500/10 flex items-center justify-center mb-2.5 text-${accentColor}-500`}>
            <Icon className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-foreground">{label}</h4>
          <p className="text-[10px] text-foreground-subtle mt-1.5 text-center px-4 leading-relaxed max-w-[280px]">
            {description}
          </p>
        </>
      )}
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 bg-black/85 backdrop-blur-md" />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full max-w-[640px] max-h-[90vh] rounded-2xl border border-yellow-500/20 bg-[#0e0e11] overflow-hidden shadow-2xl z-10 flex flex-col"
            style={{ boxShadow: '0 0 60px rgba(234, 179, 8, 0.15)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-black/30 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground tracking-tight uppercase">
                  Draga AI Vision Agent
                </h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                  DUAL IMAGE
                </span>
              </div>
              <button onClick={onClose}
                className="p-1 rounded-lg hover:bg-white/[0.06] text-foreground-subtle hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto flex-1">

              {/* ═══ UPLOAD PHASE ═══ */}
              {scanStep === 'upload' && (
                <div className="space-y-5">
                  {/* Two dropzones side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <DropZone
                      label="Image 1 — Chart"
                      description="Full TradingView chart screenshot for ICT/SMC analysis"
                      icon={Image}
                      preview={chartImage}
                      onFile={processChartFile}
                      onClear={() => { setChartImage(null); setChartImageDisplay(null); }}
                      inputRef={chartFileRef}
                      accentColor="yellow"
                    />
                    <DropZone
                      label="Image 2 — Position"
                      description="Cropped screenshot of the TradingView position settings modal"
                      icon={SlidersHorizontal}
                      preview={detailsImage}
                      onFile={processDetailsFile}
                      onClear={() => { setDetailsImage(null); setDetailsImagePreview(null); }}
                      inputRef={detailsFileRef}
                      accentColor="blue"
                    />
                  </div>

                  {/* Risk context inputs — using text inputs for safe decimal typing */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-foreground-subtle uppercase tracking-wider font-bold mb-1.5 block">
                        Account Balance
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={accountBalanceStr}
                        placeholder="e.g. 6000"
                        onChange={(e) => {
                          const v = e.target.value;
                          // Allow digits, one dot, and empty string
                          if (v === '' || /^\d*\.?\d*$/.test(v)) {
                            setAccountBalanceStr(v);
                          }
                        }}
                        className="input-field w-full text-sm font-sans"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-foreground-subtle uppercase tracking-wider font-bold mb-1.5 block">
                        Risk %
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={riskPercentStr}
                        placeholder="1"
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || /^\d*\.?\d*$/.test(v)) {
                            setRiskPercentStr(v);
                          }
                        }}
                        className="input-field w-full text-sm font-sans"
                      />
                    </div>
                  </div>

                  {/* Analyze button */}
                  <button
                    onClick={handleAnalyze}
                    disabled={!chartImage || !detailsImage}
                    className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      chartImage && detailsImage
                        ? 'bg-yellow-500 text-black hover:bg-yellow-600 border border-yellow-600/35 cursor-pointer'
                        : 'bg-white/[0.04] text-foreground-subtle border border-white/[0.06] cursor-not-allowed'
                    }`}
                  >
                    <BrainCircuit className="w-4 h-4" />
                    {chartImage && detailsImage ? 'Analyze Both Images' : 'Upload both images to continue'}
                  </button>

                  <p className="text-[10px] text-foreground-subtle/50 text-center">
                    💡 <span className="text-yellow-500/60 font-semibold">Ctrl + V</span> to paste screenshots directly from clipboard — first paste → Chart, second paste → Position
                  </p>
                </div>
              )}

              {/* ═══ SCANNING ═══ */}
              {scanStep === 'scanning' && (
                <div className="space-y-6">
                  {/* Dual preview */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative h-28 rounded-xl overflow-hidden bg-black border border-white/[0.04]">
                      {chartImage && <img src={chartImage} alt="Chart" className="w-full h-full object-cover opacity-60" />}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-2 py-1 rounded bg-black/70 text-yellow-500 text-[10px] font-bold">CHART</span>
                      </div>
                    </div>
                    <div className="relative h-28 rounded-xl overflow-hidden bg-black border border-white/[0.04]">
                      {detailsImage && <img src={detailsImage} alt="Details" className="w-full h-full object-cover opacity-60" />}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="px-2 py-1 rounded bg-black/70 text-blue-400 text-[10px] font-bold">POSITION</span>
                      </div>
                    </div>
                  </div>

                  {/* Scanner bar */}
                  <div className="relative h-1 rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      className="absolute h-full w-1/3 bg-gradient-to-r from-yellow-500 to-blue-400 rounded-full"
                      animate={{ left: ['0%', '67%', '0%'] }}
                      transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>

                  <div className="flex items-center justify-center gap-2 text-yellow-500 text-xs font-semibold">
                    <Cpu className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing both images...</span>
                  </div>

                  {/* Log console */}
                  <div className="p-4 rounded-xl bg-black/60 border border-white/[0.04] font-mono text-[11px] text-foreground-subtle space-y-2 h-36 overflow-y-auto">
                    {progressLogs.map((log, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        className={`flex items-start gap-1.5 ${log.includes('✗') ? 'text-red-400' : log.includes('✓') ? 'text-green-400' : 'text-yellow-500/90'}`}>
                        <span className="text-yellow-600/50">&gt;&gt;</span>
                        <span>{log}</span>
                      </motion.div>
                    ))}
                    <div ref={logsEndRef} />
                  </div>
                </div>
              )}

              {/* ═══ ERROR ═══ */}
              {scanStep === 'error' && (
                <div className="space-y-6">
                  <div className="flex flex-col items-center py-8 text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                      errorMessage.includes('not a financial') || errorMessage.includes('not recognized')
                        ? 'bg-orange-500/10 text-orange-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {errorMessage.includes('not a financial') || errorMessage.includes('not recognized')
                        ? <ShieldAlert className="w-7 h-7" />
                        : <AlertTriangle className="w-7 h-7" />
                      }
                    </div>
                    <h4 className="text-sm font-bold text-foreground mb-2">
                      {errorMessage.includes('not a financial') || errorMessage.includes('not recognized')
                        ? 'Invalid Chart Image'
                        : 'Analysis Failed'
                      }
                    </h4>
                    <p className="text-xs text-foreground-subtle max-w-[380px] leading-relaxed">
                      {errorMessage || 'Vision AI could not analyze the screenshots.'}
                    </p>
                  </div>
                  {progressLogs.length > 0 && (
                    <div className="p-3 rounded-xl bg-black/60 border border-white/[0.04] font-mono text-[10px] space-y-1.5 max-h-28 overflow-y-auto">
                      {progressLogs.slice(-5).map((log, i) => (
                        <div key={i} className={log.includes('✗') ? 'text-red-400' : 'text-yellow-500/70'}>{log}</div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-center gap-3">
                    <button onClick={() => setScanStep('upload')} className="btn-secondary py-2 text-xs flex items-center gap-1.5 font-sans">
                      <Upload className="w-3.5 h-3.5" /><span>Re-upload</span>
                    </button>
                    <button onClick={handleRetry} className="btn-primary py-2 text-xs flex items-center gap-1.5 bg-yellow-500 text-black hover:bg-yellow-600 border border-yellow-600/35 font-sans">
                      <RefreshCw className="w-3.5 h-3.5" /><span>Retry</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ═══ REVIEW ═══ */}
              {scanStep === 'review' && (
                <div className="space-y-5">
                  {/* Chart preview */}
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/[0.05] bg-black">
                    {(chartImageDisplay || chartImage) && (
                      <img src={chartImageDisplay || chartImage || ''} alt="Chart" className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e11] via-[#0e0e11]/40 to-transparent" />
                    <div className="absolute bottom-3 left-4 flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        direction === 'Long'
                          ? 'bg-[#22c55e]/20 border border-[#22c55e]/30 text-[#22c55e]'
                          : 'bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444]'
                      }`}>{direction}</span>
                      <span className="text-base font-bold text-foreground font-sans">{pair}</span>
                      {riskReward && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-yellow-500/10 border border-yellow-500/20 text-yellow-500">
                          RR {riskReward}
                        </span>
                      )}
                    </div>
                    {overallConfidence > 0 && (
                      <div className="absolute top-3 right-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          overallConfidence >= 70 ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                          overallConfidence >= 40 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>{overallConfidence}% conf</span>
                      </div>
                    )}
                  </div>

                  {/* Lot size */}
                  <div className="p-5 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center space-y-3">
                    <div className="flex items-center justify-center gap-1.5 text-yellow-500">
                      <Sparkles className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Lot Size {suggestedLotSize ? '(Calculated)' : '(From Position Modal)'}
                      </h4>
                    </div>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={positionSize}
                        onChange={(e) => {
                          const v = e.target.value;
                          // Allow digits, one dot, and empty string — never snap back on partial decimals
                          if (v === '' || /^\d*\.?\d*$/.test(v)) {
                            setPositionSize(v);
                          }
                        }}
                        placeholder="0.01"
                        className="input-field text-center py-2 text-lg font-bold text-foreground border-yellow-500/30 focus:border-yellow-500 font-sans"
                      />
                  </div>

                  {/* Prices */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-foreground-subtle uppercase tracking-wider flex items-center gap-1.5">
                      <Activity className="w-3 h-3" /> Extracted Execution Data
                      <span className="text-foreground-subtle/40 font-normal">(from position modal)</span>
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <PriceField label="Entry Price" value={entryPrice} onChange={setEntryPrice} />
                      <PriceField label="Exit / Close" value={exitPrice} onChange={setExitPrice} />
                      <PriceField label="Stop Loss" value={stopLoss} onChange={setStopLoss} color="text-[#ef4444]" />
                      <PriceField label="Take Profit" value={takeProfit} onChange={setTakeProfit} color="text-[#22c55e]" />
                    </div>
                  </div>

                  {/* ─── Live P&L Display ─── */}
                  {calculatedPnl !== null && (
                    <div className={`p-4 rounded-xl border flex items-center justify-between ${
                      calculatedPnl > 0
                        ? 'bg-green-500/[0.04] border-green-500/15'
                        : calculatedPnl < 0
                        ? 'bg-red-500/[0.04] border-red-500/15'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}>
                      <div className="flex items-center gap-2">
                        {calculatedPnl >= 0
                          ? <TrendingUp className="w-4 h-4 text-green-400" />
                          : <TrendingDown className="w-4 h-4 text-red-400" />
                        }
                        <div>
                          <p className="text-[9px] text-foreground-subtle uppercase tracking-wider">Calculated P&L</p>
                          <p className="text-[10px] text-foreground-subtle/50 font-mono">
                            ({direction === 'Long' ? 'Exit−Entry' : 'Entry−Exit'}) × {positionSize || '0'} lots × 100
                          </p>
                        </div>
                      </div>
                      <span className={`text-lg font-bold font-sans ${
                        calculatedPnl > 0 ? 'text-green-400' : calculatedPnl < 0 ? 'text-red-400' : 'text-foreground-subtle'
                      }`}>
                        {calculatedPnl > 0 ? '+' : ''}{calculatedPnl.toFixed(2)}
                        <span className="text-xs ml-1 opacity-60">USD</span>
                      </span>
                    </div>
                  )}

                  {/* AI Insights */}
                  <div className="space-y-2">
                    <h5 className="text-[10px] font-bold text-yellow-500/80 uppercase tracking-wider flex items-center gap-1.5">
                      <BrainCircuit className="w-3 h-3" /> AI Vision Insights
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-yellow-500/[0.02] border border-yellow-500/10">
                        <p className="text-[9px] text-yellow-500/50 uppercase tracking-wider mb-0.5">Grade</p>
                        <p className={`font-bold font-sans ${
                          tradeGrade.includes('A') ? 'text-green-400' : tradeGrade.includes('B') ? 'text-yellow-400' :
                          tradeGrade.includes('C') ? 'text-orange-400' : 'text-red-400'
                        }`}>{tradeGrade || '—'}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-yellow-500/[0.02] border border-yellow-500/10">
                        <p className="text-[9px] text-yellow-500/50 uppercase tracking-wider mb-0.5">Confidence</p>
                        <p className="font-bold text-yellow-500 font-sans">{setupConfidence}%</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-yellow-500/[0.02] border border-yellow-500/10">
                        <p className="text-[9px] text-yellow-500/50 uppercase tracking-wider mb-0.5">Setup</p>
                        <p className="font-bold text-yellow-500 font-sans truncate" title={strategy}>{strategy || 'Unknown'}</p>
                      </div>
                    </div>

                    {confluences.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {confluences.map((c, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-yellow-500/5 border border-yellow-500/10 text-yellow-500/80">{c}</span>
                        ))}
                      </div>
                    )}

                    {(strengths.length > 0 || weaknesses.length > 0) && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {strengths.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-green-500/[0.02] border border-green-500/10">
                            <p className="text-[9px] text-green-400/60 uppercase tracking-wider mb-1">Strengths</p>
                            {strengths.map((s, i) => <p key={i} className="text-[10px] text-green-400/80 leading-relaxed">• {s}</p>)}
                          </div>
                        )}
                        {weaknesses.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-red-500/[0.02] border border-red-500/10">
                            <p className="text-[9px] text-red-400/60 uppercase tracking-wider mb-1">Weaknesses</p>
                            {weaknesses.map((w, i) => <p key={i} className="text-[10px] text-red-400/80 leading-relaxed">• {w}</p>)}
                          </div>
                        )}
                      </div>
                    )}

                    {aiCommentary && (
                      <div className="p-3 rounded-lg bg-yellow-500/[0.02] border border-yellow-500/10 mt-2">
                        <p className="text-[9px] text-yellow-500/50 uppercase tracking-wider mb-1.5">Draga AI Analysis</p>
                        <p className="text-xs text-foreground/80 leading-relaxed italic" dir="auto">&ldquo;{aiCommentary}&rdquo;</p>
                      </div>
                    )}

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {tags.map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.03] border border-white/[0.06] text-foreground-subtle">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex justify-between items-center pt-3 border-t border-white/[0.04]">
                    <button onClick={handleRetry} className="text-xs text-foreground-subtle hover:text-yellow-500 flex items-center gap-1 transition-colors">
                      <RefreshCw className="w-3 h-3" /><span>Re-analyze</span>
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => handleSave(true)} className="btn-secondary py-2 text-xs flex items-center gap-1.5 font-sans">
                        <Save className="w-3.5 h-3.5 text-foreground-subtle" /><span>Save Draft</span>
                      </button>
                      <button onClick={() => handleSave(false)} className="btn-primary py-2 text-xs flex items-center gap-1.5 bg-yellow-500 text-black hover:bg-yellow-600 border border-yellow-600/35 font-sans">
                        <Check className="w-3.5 h-3.5" /><span>Log Trade</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
