'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft, TrendingUp, DollarSign, Shield, Brain,
  FileText, Star, Check, ChevronRight, Loader2,
  ArrowUpRight, ArrowDownRight, ImagePlus, Tag, X, Save,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useTradeStore, isSupabaseConfigured, supabase, calculateTradePnl } from '@/lib/store';
import {
  TradeFormData, tradeSchema, MARKETS, DIRECTIONS, SESSIONS,
  TIMEFRAMES, EMOTIONS, type Market, type Direction, type Session,
  type Timeframe, type Emotion,
} from '@/lib/types';
import { getEmotionEmoji } from '@/lib/utils';

const sections = [
  { id: 'info', label: 'Trade Info', icon: TrendingUp },
  { id: 'price', label: 'Price & Size', icon: DollarSign },
  { id: 'risk', label: 'Risk Management', icon: Shield },
  { id: 'psychology', label: 'Psychology', icon: Brain },
  { id: 'notes', label: 'Notes & Media', icon: FileText },
];

export default function AddTradeContent() {
  const router = useRouter();
  const addTrade = useTradeStore((s) => s.addTrade);
  const [activeSection, setActiveSection] = useState('info');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TradeFormData>({
    resolver: zodResolver(tradeSchema),
    defaultValues: {
      pair: '',
      market: 'Forex',
      direction: 'Long',
      entryPrice: 0,
      exitPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      positionSize: 0.01,
      riskPercent: 1,
      rewardPercent: 2,
      fees: 0,
      session: 'London',
      strategy: '',
      setup: '',
      timeframe: '15m',
      date: new Date().toISOString().split('T')[0],
      duration: '',
      rating: 3,
      emotionBefore: 'Calm',
      emotionDuring: 'Calm',
      emotionAfter: 'Calm',
      confidenceLevel: 5,
      isMistake: false,
      lessonsLearned: '',
      screenshotUrl: '',
      tradingViewLink: '',
      notes: '',
      tags: [],
      isFavorite: false,
    },
  });

  const watchedValues = watch();
  const direction = watch('direction');
  const tags = watch('tags');

  // Load draft on mount
  React.useEffect(() => {
    const draft = localStorage.getItem('trading-journal-add-draft');
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        Object.entries(parsed).forEach(([key, value]) => {
          setValue(key as any, value);
        });
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [setValue]);

  // Save draft on change
  React.useEffect(() => {
    localStorage.setItem('trading-journal-add-draft', JSON.stringify(watchedValues));
  }, [watchedValues]);

  // Real-time calculations
  const entryPrice = watch('entryPrice');
  const exitPrice = watch('exitPrice');
  const stopLoss = watch('stopLoss');
  const positionSize = watch('positionSize');
  const fees = watch('fees');

  const market = watch('market');

  const calculatedPnl = calculateTradePnl(
    market,
    watch('pair'),
    direction,
    entryPrice,
    exitPrice,
    positionSize,
    fees
  );

  const risk = Math.abs(entryPrice - stopLoss);
  const reward = direction === 'Long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  const calculatedRR = risk > 0 ? (reward / risk) : 0;

  // Auto-calculate risk % and reward % based on SL and TP
  React.useEffect(() => {
    if (entryPrice > 0 && stopLoss > 0) {
      const riskPct = Number(((Math.abs(entryPrice - stopLoss) / entryPrice) * 100).toFixed(2));
      setValue('riskPercent', riskPct);
    }
  }, [entryPrice, stopLoss, setValue]);

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupabaseConfigured) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('screenshotUrl', reader.result as string);
        toast.success('Screenshot saved locally in draft!');
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      toast.loading('Uploading screenshot...', { id: 'upload-toast' });
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `screenshots/${fileName}`;

      const { data, error } = await supabase.storage
        .from('screenshots')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('screenshots')
        .getPublicUrl(filePath);

      setValue('screenshotUrl', publicUrl);
      toast.success('Screenshot uploaded to Supabase Storage!', { id: 'upload-toast' });
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`, { id: 'upload-toast' });
    }
  };

  const onSubmit = async (data: TradeFormData) => {
    setIsSubmitting(true);
    try {
      await addTrade({
        ...data,
        date: new Date(data.date).toISOString(),
        isArchived: false,
      });
      localStorage.removeItem('trading-journal-add-draft');
      toast.success('Trade logged successfully!');
      router.push('/trades');
    } catch {
      toast.error('Failed to save trade');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue('tags', [...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setValue('tags', tags.filter((t) => t !== tag));
  };

  return (
    <div className="max-w-[1000px] mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-8"
      >
        <Link
          href="/trades"
          className="w-10 h-10 rounded-xl bg-card border border-border-subtle flex items-center justify-center hover:bg-card-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground-subtle" />
        </Link>
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Log Trade</h2>
          <p className="text-foreground-subtle mt-0.5">Record your trade details and psychology</p>
        </div>
      </motion.div>

      {/* Section Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-1 p-1 mb-8 rounded-xl bg-card border border-border-subtle overflow-x-auto"
      >
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeSection === section.id
                ? 'bg-accent-blue/10 text-accent-blue'
                : 'text-foreground-subtle hover:text-foreground hover:bg-white/[0.03]'
            }`}
          >
            <section.icon className="w-4 h-4" />
            {section.label}
          </button>
        ))}
      </motion.div>

      {/* Real-time Calculation Banner */}
      {(entryPrice > 0 && exitPrice > 0) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mb-6 p-4 rounded-xl bg-card border border-border-subtle flex items-center gap-6"
        >
          <div>
            <p className="text-[11px] text-foreground-subtle uppercase tracking-wider">Est. P&L</p>
            <p className={`text-xl font-bold ${calculatedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {calculatedPnl >= 0 ? '+' : ''}${calculatedPnl.toFixed(2)}
            </p>
          </div>
          <div className="w-px h-10 bg-border-subtle" />
          <div>
            <p className="text-[11px] text-foreground-subtle uppercase tracking-wider">R:R</p>
            <p className={`text-xl font-bold ${calculatedRR >= 0 ? 'text-foreground' : 'text-loss'}`}>
              {calculatedRR.toFixed(2)}R
            </p>
          </div>
          <div className="w-px h-10 bg-border-subtle" />
          <div>
            <p className="text-[11px] text-foreground-subtle uppercase tracking-wider">Result</p>
            <span className={`badge ${calculatedPnl > 0 ? 'badge-win' : calculatedPnl < 0 ? 'badge-loss' : 'badge-breakeven'}`}>
              {calculatedPnl > 0 ? 'WIN' : calculatedPnl < 0 ? 'LOSS' : 'BE'}
            </span>
          </div>
        </motion.div>
      )}

      <form onSubmit={handleSubmit(onSubmit)}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-card border border-border-subtle p-8 space-y-8"
        >
          {/* SECTION: Trade Info */}
            <div className={activeSection === 'info' ? 'space-y-6' : 'hidden'}>
              <h3 className="text-lg font-semibold text-foreground">Trade Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Pair */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Trading Pair</label>
                  <input
                    {...register('pair')}
                    placeholder="e.g. EUR/USD, BTC/USD"
                    className="input-field"
                  />
                  {errors.pair && <p className="text-xs text-loss mt-1">{errors.pair.message}</p>}
                </div>

                {/* Market */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Market</label>
                  <select {...register('market')} className="input-field cursor-pointer">
                    {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                {/* Direction */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Direction</label>
                  <div className="flex gap-2">
                    {DIRECTIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setValue('direction', d)}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
                          direction === d
                            ? d === 'Long'
                              ? 'bg-profit/15 text-profit border border-profit/30'
                              : 'bg-loss/15 text-loss border border-loss/30'
                            : 'bg-white/[0.03] text-foreground-subtle border border-border-subtle hover:bg-white/[0.06]'
                        }`}
                      >
                        {d === 'Long' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {d}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Session */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Session</label>
                  <select {...register('session')} className="input-field cursor-pointer">
                    {SESSIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Strategy */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Strategy</label>
                  <input
                    {...register('strategy')}
                    placeholder="e.g. Order Block, FVG"
                    className="input-field"
                  />
                  {errors.strategy && <p className="text-xs text-loss mt-1">{errors.strategy.message}</p>}
                </div>

                {/* Timeframe */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Timeframe</label>
                  <select {...register('timeframe')} className="input-field cursor-pointer">
                    {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Date</label>
                  <input type="date" {...register('date')} className="input-field" />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Duration</label>
                  <input {...register('duration')} placeholder="e.g. 2h 30m" className="input-field" />
                </div>

                {/* Setup */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Setup Description</label>
                  <input {...register('setup')} placeholder="Describe your trade setup..." className="input-field" />
                </div>
              </div>
            </div>

          {/* SECTION: Price & Size */}
            <div className={activeSection === 'price' ? 'space-y-6' : 'hidden'}>
              <h3 className="text-lg font-semibold text-foreground">Price & Size</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Entry Price</label>
                  <input type="number" step="any" {...register('entryPrice', { valueAsNumber: true })} placeholder="0.00" className="input-field" />
                  {errors.entryPrice && <p className="text-xs text-loss mt-1">{errors.entryPrice.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Exit Price</label>
                  <input type="number" step="any" {...register('exitPrice', { valueAsNumber: true })} placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Stop Loss</label>
                  <input type="number" step="any" {...register('stopLoss', { valueAsNumber: true })} placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Take Profit</label>
                  <input type="number" step="any" {...register('takeProfit', { valueAsNumber: true })} placeholder="0.00" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Position Size (Lots)</label>
                  <input type="number" step="any" {...register('positionSize', { valueAsNumber: true })} placeholder="0.01" className="input-field" />
                </div>
              </div>
            </div>

          {/* SECTION: Risk Management */}
            <div className={activeSection === 'risk' ? 'space-y-6' : 'hidden'}>
              <h3 className="text-lg font-semibold text-foreground">Risk Management</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Risk %</label>
                  <input type="number" step="0.1" {...register('riskPercent', { valueAsNumber: true })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground-subtle mb-2">Reward %</label>
                  <input type="number" step="0.1" {...register('rewardPercent', { valueAsNumber: true })} className="input-field" />
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-foreground-subtle mb-3">Trade Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setValue('rating', n)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          n <= watchedValues.rating
                            ? 'fill-yellow-500 text-yellow-500'
                            : 'text-foreground-subtle/30'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Mistake */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setValue('isMistake', !watchedValues.isMistake)}
                  className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                    watchedValues.isMistake
                      ? 'bg-loss border-loss'
                      : 'border-border bg-transparent hover:border-foreground-subtle'
                  }`}
                >
                  {watchedValues.isMistake && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <label className="text-sm text-foreground-muted">This trade was a mistake</label>
              </div>
            </div>

          {/* SECTION: Psychology */}
            <div className={activeSection === 'psychology' ? 'space-y-6' : 'hidden'}>
              <h3 className="text-lg font-semibold text-foreground">Psychology</h3>
              
              {/* Emotions */}
              {(['emotionBefore', 'emotionDuring', 'emotionAfter'] as const).map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-foreground-subtle mb-3">
                    {field === 'emotionBefore' ? 'Emotion Before Trade' : field === 'emotionDuring' ? 'Emotion During Trade' : 'Emotion After Trade'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {EMOTIONS.map((emotion) => (
                      <button
                        key={emotion}
                        type="button"
                        onClick={() => setValue(field, emotion)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                          watchedValues[field] === emotion
                            ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30'
                            : 'bg-white/[0.03] text-foreground-subtle border border-transparent hover:bg-white/[0.06]'
                        }`}
                      >
                        <span>{getEmotionEmoji(emotion)}</span>
                        {emotion}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Confidence */}
              <div>
                <label className="block text-sm font-medium text-foreground-subtle mb-3">
                  Confidence Level: {watchedValues.confidenceLevel}/10
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  {...register('confidenceLevel', { valueAsNumber: true })}
                  className="w-full h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-accent-blue"
                />
                <div className="flex justify-between text-[10px] text-foreground-subtle/50 mt-1">
                  <span>Low</span>
                  <span>High</span>
                </div>
              </div>

              {/* Lessons */}
              <div>
                <label className="block text-sm font-medium text-foreground-subtle mb-2">Lessons Learned</label>
                <textarea
                  {...register('lessonsLearned')}
                  rows={3}
                  placeholder="What did you learn from this trade?"
                  className="input-field resize-none"
                />
              </div>
            </div>

          {/* SECTION: Notes & Media */}
            <div className={activeSection === 'notes' ? 'space-y-6' : 'hidden'}>
              <h3 className="text-lg font-semibold text-foreground">Notes & Media</h3>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-foreground-subtle mb-2">Trade Notes</label>
                <textarea
                  {...register('notes')}
                  rows={5}
                  placeholder="Describe your trade analysis, what happened, what you observed..."
                  className="input-field resize-none"
                />
              </div>

               {/* Screenshot URL */}
              <div>
                <label className="block text-sm font-medium text-foreground-subtle mb-2">Screenshot URL</label>
                <div className="flex gap-2">
                  <input {...register('screenshotUrl')} placeholder="Paste screenshot URL or upload" className="input-field flex-1" />
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-secondary flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-4 h-4" />
                    <span>Upload</span>
                  </button>
                </div>
              </div>

              {/* TradingView Link */}
              <div>
                <label className="block text-sm font-medium text-foreground-subtle mb-2">TradingView Link</label>
                <input {...register('tradingViewLink')} placeholder="https://www.tradingview.com/..." className="input-field" />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-foreground-subtle mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-purple/10 text-accent-purple text-xs font-medium"
                    >
                      #{tag}
                      <button type="button" onClick={() => removeTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag..."
                    className="input-field flex-1"
                  />
                  <button type="button" onClick={addTag} className="btn-secondary">
                    <Tag className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Favorite */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setValue('isFavorite', !watchedValues.isFavorite)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-6 h-6 ${
                      watchedValues.isFavorite
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-foreground-subtle/30'
                    }`}
                  />
                </button>
                <label className="text-sm text-foreground-muted">Mark as favorite</label>
              </div>
            </div>
        </motion.div>

        {/* Submit Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-6 space-y-3"
        >
          {/* Validation Errors */}
          {Object.keys(errors).length > 0 && (
            <div className="p-4 rounded-2xl bg-loss/5 border border-loss/20">
              <p className="text-xs font-semibold text-loss mb-2">Please fix the following errors:</p>
              <ul className="space-y-1">
                {Object.entries(errors).map(([field, error]) => (
                  <li key={field} className="text-xs text-loss/80">
                    • <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>: {(error as any)?.message || 'Invalid value'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border-subtle">
            <div className="flex gap-2">
              {sections.map((section, i) => {
                const currentIndex = sections.findIndex((s) => s.id === activeSection);
                // Check if this section has errors
                const sectionFields: Record<string, string[]> = {
                  info: ['pair', 'market', 'direction', 'session', 'strategy', 'timeframe', 'date', 'duration', 'setup'],
                  price: ['entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'positionSize', 'fees'],
                  risk: ['riskPercent', 'rewardPercent', 'rating', 'isMistake'],
                  psychology: ['emotionBefore', 'emotionDuring', 'emotionAfter', 'confidenceLevel', 'lessonsLearned'],
                  notes: ['notes', 'screenshotUrl', 'tradingViewLink', 'tags', 'isFavorite'],
                };
                const hasError = sectionFields[section.id]?.some((f) => f in errors);
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      hasError ? 'bg-loss' : i <= currentIndex ? 'bg-accent-blue' : 'bg-white/10'
                    }`}
                    title={section.label}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-3">
              {activeSection !== 'info' && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = sections.findIndex((s) => s.id === activeSection);
                    if (idx > 0) setActiveSection(sections[idx - 1].id);
                  }}
                  className="btn-secondary"
                >
                  Back
                </button>
              )}
              {activeSection !== 'notes' && (
                <button
                  type="button"
                  onClick={() => {
                    const idx = sections.findIndex((s) => s.id === activeSection);
                    if (idx < sections.length - 1) setActiveSection(sections[idx + 1].id);
                  }}
                  className="btn-secondary"
                >
                  Continue
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Trade
              </button>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
