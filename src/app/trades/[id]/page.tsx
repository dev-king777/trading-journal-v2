'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowLeft, ArrowUpRight, ArrowDownRight, Star, Edit3,
  Trash2, Copy, ExternalLink, Clock, Target, DollarSign,
  BarChart3, Brain, Calendar, Tag, TrendingUp, Save, MessageSquare, Plus, Check, ImagePlus, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/layout/AppLayout';
import { useTradeStore, useCommentsStore, isSupabaseConfigured, supabase } from '@/lib/store';
import { getEmotionEmoji, formatCurrency, getRelativeTime } from '@/lib/utils';
import { Market, Direction, Session, Timeframe, Emotion, MARKETS, DIRECTIONS, SESSIONS, TIMEFRAMES, EMOTIONS } from '@/lib/types';

export default function TradeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tradeId = params.id as string;
  const trade = useTradeStore((s) => s.getTradeById(tradeId));
  const { updateTrade, deleteTrade, duplicateTrade, toggleFavorite } = useTradeStore();
  const { comments, addComment, deleteComment, fetchComments } = useCommentsStore();

  const [isEditing, setIsEditing] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Editable Form fields state
  const [editPair, setEditPair] = useState('');
  const [editMarket, setEditMarket] = useState<Market>('Forex');
  const [editDirection, setEditDirection] = useState<Direction>('Long');
  const [editEntryPrice, setEditEntryPrice] = useState(0);
  const [editExitPrice, setEditExitPrice] = useState(0);
  const [editStopLoss, setEditStopLoss] = useState(0);
  const [editTakeProfit, setEditTakeProfit] = useState(0);
  const [editPositionSize, setEditPositionSize] = useState(0.01);
  const [editFees, setEditFees] = useState(0);
  const [editStrategy, setEditStrategy] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLessons, setEditLessons] = useState('');
  const [editRating, setEditRating] = useState(3);
  const [editEmotionBefore, setEditEmotionBefore] = useState<Emotion>('Calm');
  const [editEmotionDuring, setEditEmotionDuring] = useState<Emotion>('Calm');
  const [editEmotionAfter, setEditEmotionAfter] = useState<Emotion>('Calm');
  const [editScreenshotUrl, setEditScreenshotUrl] = useState('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Load comments
  useEffect(() => {
    if (tradeId) fetchComments(tradeId);
  }, [tradeId, fetchComments]);

  // Load trade values into edit state
  useEffect(() => {
    if (trade) {
      setEditPair(trade.pair);
      setEditMarket(trade.market);
      setEditDirection(trade.direction);
      setEditEntryPrice(trade.entryPrice);
      setEditExitPrice(trade.exitPrice);
      setEditStopLoss(trade.stopLoss);
      setEditTakeProfit(trade.takeProfit);
      setEditPositionSize(trade.positionSize);
      setEditFees(trade.fees);
      setEditStrategy(trade.strategy);
      setEditNotes(trade.notes);
      setEditLessons(trade.lessonsLearned);
      setEditRating(trade.rating);
      setEditEmotionBefore(trade.emotionBefore);
      setEditEmotionDuring(trade.emotionDuring);
      setEditEmotionAfter(trade.emotionAfter);
      setEditScreenshotUrl(trade.screenshotUrl || '');
    }
  }, [trade]);

  if (!trade) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <h2 className="text-xl font-semibold text-foreground mb-2">Trade not found</h2>
          <p className="text-foreground-subtle mb-4">This trade may have been deleted.</p>
          <Link href="/trades" className="btn-primary">← Back to Trades</Link>
        </div>
      </AppLayout>
    );
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await deleteTrade(trade.id);
      toast.success('Trade deleted');
      router.push('/trades');
    }
  };

  const handleDuplicate = async () => {
    await duplicateTrade(trade.id);
    toast.success('Trade duplicated');
  };

  const handleSaveEdits = async () => {
    try {
      await updateTrade(trade.id, {
        pair: editPair,
        market: editMarket,
        direction: editDirection,
        entryPrice: editEntryPrice,
        exitPrice: editExitPrice,
        stopLoss: editStopLoss,
        takeProfit: editTakeProfit,
        positionSize: editPositionSize,
        fees: editFees,
        strategy: editStrategy,
        notes: editNotes,
        lessonsLearned: editLessons,
        rating: editRating,
        emotionBefore: editEmotionBefore,
        emotionDuring: editEmotionDuring,
        emotionAfter: editEmotionAfter,
        screenshotUrl: editScreenshotUrl,
      });
      setIsEditing(false);
      toast.success('Changes saved successfully!');
    } catch {
      toast.error('Failed to save changes');
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isSupabaseConfigured) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditScreenshotUrl(reader.result as string);
        toast.success('Screenshot saved locally in draft!');
      };
      reader.readAsDataURL(file);
      return;
    }

    try {
      setIsUploadingScreenshot(true);
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

      setEditScreenshotUrl(publicUrl);
      toast.success('Screenshot uploaded successfully!', { id: 'upload-toast' });
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`, { id: 'upload-toast' });
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    await addComment(trade.id, commentInput.trim());
    setCommentInput('');
    toast.success('Comment added');
  };

  const DEFAULT_CHARTS = [
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1618044733300-9472054094ee?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1608248597481-496100c80836?auto=format&fit=crop&w=600&q=80',
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80',
  ];

  const getValidImages = () => {
    if (!trade.screenshotUrl) return [];
    if (trade.screenshotUrl.startsWith('data:image')) {
      return [trade.screenshotUrl];
    }
    const list = trade.screenshotUrl.split(',').map(url => url.trim());
    return list.filter(url => url.startsWith('http') || url.startsWith('data:image'));
  };

  const images = getValidImages();
  if (images.length === 0) {
    const charCodeSum = trade.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    images.push(DEFAULT_CHARTS[charCodeSum % DEFAULT_CHARTS.length]);
  }

  return (
    <AppLayout>
      <div className="max-w-[1000px] mx-auto space-y-6">
        {/* Back + Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Link
            href="/trades"
            className="flex items-center gap-2 text-sm text-foreground-subtle hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Trades
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleFavorite(trade.id)}
              className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
            >
              <Star className={`w-4 h-4 ${trade.isFavorite ? 'fill-yellow-500 text-yellow-500' : 'text-foreground-subtle'}`} />
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`btn-secondary text-sm py-2 ${isEditing ? 'border-accent-blue/40 text-accent-blue' : ''}`}
            >
              <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'Cancel' : 'Edit'}
            </button>
            <button onClick={handleDuplicate} className="btn-secondary text-sm py-2">
              <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>
            <button onClick={handleDelete} className="btn-secondary text-sm py-2 text-loss hover:bg-loss/10 hover:border-loss/30">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </motion.div>

        {/* Edit Form vs Normal Details rendering */}
        {isEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 space-y-6"
          >
            <h3 className="text-lg font-bold text-foreground">Edit Trade Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Trading Pair</label>
                <input value={editPair} onChange={(e) => setEditPair(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Market</label>
                <select value={editMarket} onChange={(e) => setEditMarket(e.target.value as Market)} className="input-field">
                  {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Direction</label>
                <select value={editDirection} onChange={(e) => setEditDirection(e.target.value as Direction)} className="input-field">
                  {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Entry Price</label>
                <input type="number" step="any" value={editEntryPrice} onChange={(e) => setEditEntryPrice(parseFloat(e.target.value) || 0)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Exit Price</label>
                <input type="number" step="any" value={editExitPrice} onChange={(e) => setEditExitPrice(parseFloat(e.target.value) || 0)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Stop Loss</label>
                <input type="number" step="any" value={editStopLoss} onChange={(e) => setEditStopLoss(parseFloat(e.target.value) || 0)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Take Profit</label>
                <input type="number" step="any" value={editTakeProfit} onChange={(e) => setEditTakeProfit(parseFloat(e.target.value) || 0)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Position Size</label>
                <input type="number" step="any" value={editPositionSize} onChange={(e) => setEditPositionSize(parseFloat(e.target.value) || 0)} className="input-field" />
              </div>

              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Strategy</label>
                <input value={editStrategy} onChange={(e) => setEditStrategy(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Trade Rating (1-5)</label>
                <select value={editRating} onChange={(e) => setEditRating(parseInt(e.target.value) || 3)} className="input-field">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} Stars</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Emotion Before</label>
                <select value={editEmotionBefore} onChange={(e) => setEditEmotionBefore(e.target.value as Emotion)} className="input-field">
                  {EMOTIONS.map((em) => <option key={em} value={em}>{getEmotionEmoji(em)} {em}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Emotion During</label>
                <select value={editEmotionDuring} onChange={(e) => setEditEmotionDuring(e.target.value as Emotion)} className="input-field">
                  {EMOTIONS.map((em) => <option key={em} value={em}>{getEmotionEmoji(em)} {em}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Emotion After</label>
                <select value={editEmotionAfter} onChange={(e) => setEditEmotionAfter(e.target.value as Emotion)} className="input-field">
                  {EMOTIONS.map((em) => <option key={em} value={em}>{getEmotionEmoji(em)} {em}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-foreground-subtle mb-1">Notes</label>
              <textarea rows={4} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} className="input-field" />
            </div>

            <div>
              <label className="block text-xs text-foreground-subtle mb-1">Lessons Learned</label>
              <textarea rows={4} value={editLessons} onChange={(e) => setEditLessons(e.target.value)} className="input-field" />
            </div>

            <div>
              <label className="block text-xs text-foreground-subtle mb-2">Screenshot (Image upload or URL)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editScreenshotUrl}
                  onChange={(e) => setEditScreenshotUrl(e.target.value)}
                  placeholder="Paste image URL or upload file..."
                  className="input-field flex-1 text-xs"
                />
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
                  disabled={isUploadingScreenshot}
                  className="btn-secondary flex items-center gap-1.5 text-xs py-2"
                >
                  {isUploadingScreenshot ? (
                    <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  ) : (
                    <ImagePlus className="w-4.5 h-4.5" />
                  )}
                  <span>Upload</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="btn-secondary">Cancel</button>
              <button onClick={handleSaveEdits} className="btn-primary">
                <Save className="w-4 h-4" /> Save Changes
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Hero Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-8 border ${
                trade.pnl > 0
                  ? 'bg-gradient-to-br from-profit/5 to-transparent border-profit/10'
                  : trade.pnl < 0
                  ? 'bg-gradient-to-br from-loss/5 to-transparent border-loss/10'
                  : 'bg-card border-border-subtle'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    trade.direction === 'Long' ? 'bg-profit/15 text-profit' : 'bg-loss/15 text-loss'
                  }`}>
                    {trade.direction === 'Long' ? <ArrowUpRight className="w-7 h-7" /> : <ArrowDownRight className="w-7 h-7" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-3xl font-bold text-foreground">{trade.pair}</h1>
                      <span className={`badge text-sm ${
                        trade.pnl > 0 ? 'badge-win' : trade.pnl < 0 ? 'badge-loss' : 'badge-breakeven'
                      }`}>
                        {trade.pnl > 0 ? 'WIN' : trade.pnl < 0 ? 'LOSS' : 'BREAKEVEN'}
                      </span>
                    </div>
                    <p className="text-foreground-subtle mt-1">
                      {trade.direction} · {trade.market} · {trade.timeframe} · {trade.session} Session
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className={`text-4xl font-bold ${
                    trade.pnl > 0 ? 'text-profit' : trade.pnl < 0 ? 'text-loss' : 'text-gray-400'
                  }`}>
                    {trade.pnl > 0 ? '+$' : trade.pnl < 0 ? '-$' : '$'}{Math.abs(trade.pnl).toFixed(2)}
                  </p>
                  <p className="text-lg font-semibold text-foreground-muted mt-1">
                    {trade.rrRatio.toFixed(2)}R
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Image Gallery */}
            {images.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl bg-card border border-border-subtle p-6 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">Screenshot Gallery</h3>
                  <span className="text-[10px] text-foreground-subtle bg-white/5 px-2 py-0.5 rounded">Click image to zoom</span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {images.map((imgUrl, i) => (
                    <div
                      key={i}
                      onClick={() => setActiveLightboxImg(imgUrl)}
                      className="relative rounded-xl overflow-hidden border border-white/5 aspect-video bg-black cursor-zoom-in group/img transition-all hover:border-yellow-500/30"
                    >
                      <img src={imgUrl} alt={`screenshot-${i}`} className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-[1.02]" />
                      <div className="absolute inset-0 bg-black/10 group-hover/img:bg-black/0 transition-colors" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveLightboxImg(imgUrl);
                        }}
                        className="absolute bottom-3 right-3 p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors opacity-0 group-hover/img:opacity-100"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Lightbox Zoom Portal Overlay */}
            <AnimatePresence>
              {activeLightboxImg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                  {/* Backdrop */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setActiveLightboxImg(null)}
                    className="fixed inset-0 bg-black/90 backdrop-blur-md cursor-zoom-out"
                  />
                  {/* Zoomed Image */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative max-w-[95vw] max-h-[90vh] z-10 select-none overflow-hidden rounded-xl border border-white/10 bg-black flex items-center justify-center"
                  >
                    <img
                      src={activeLightboxImg}
                      alt="Zoomed Screenshot Preview"
                      className="max-w-full max-h-[85vh] object-contain"
                    />
                    <button
                      onClick={() => setActiveLightboxImg(null)}
                      className="absolute top-4 right-4 p-2.5 rounded-full bg-black/70 hover:bg-black/90 text-white hover:scale-105 transition-all border border-white/10"
                    >
                      <X className="w-4.5 h-4.5" />
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Entry', value: trade.entryPrice.toFixed(5), icon: TrendingUp },
                { label: 'Exit', value: trade.exitPrice.toFixed(5), icon: TrendingUp },
                { label: 'Stop Loss', value: trade.stopLoss.toFixed(5), icon: Target },
                { label: 'Take Profit', value: trade.takeProfit.toFixed(5), icon: Target },
                { label: 'Position Size', value: `${trade.positionSize} lots`, icon: BarChart3 },
                { label: 'Risk', value: `${trade.riskPercent}%`, icon: DollarSign },
                { label: 'Duration', value: trade.duration || '—', icon: Clock },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl bg-card border border-border-subtle">
                  <div className="flex items-center gap-2 mb-2">
                    <stat.icon className="w-3.5 h-3.5 text-foreground-subtle" />
                    <span className="text-xs text-foreground-subtle">{stat.label}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Psychology Card */}
            <div className="rounded-2xl bg-card border border-border-subtle p-6 space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Brain className="w-4 h-4 text-accent-purple" />
                Psychology & Emotion History
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Before', emotion: trade.emotionBefore },
                  { label: 'During', emotion: trade.emotionDuring },
                  { label: 'After', emotion: trade.emotionAfter },
                ].map((e) => (
                  <div key={e.label} className="text-center p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-3xl">{getEmotionEmoji(e.emotion)}</span>
                    <p className="text-sm font-medium text-foreground mt-2">{e.emotion}</p>
                    <p className="text-[11px] text-foreground-subtle">{e.label} Trade</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline & History Activity Log */}
            <div className="rounded-2xl bg-card border border-border-subtle p-6 space-y-4">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-cyan" />
                Activity Log
              </h3>
              <div className="space-y-4 text-sm relative pl-6 before:absolute before:left-2.5 before:top-1 before:bottom-1 before:w-0.5 before:bg-white/5">
                <div className="relative">
                  <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-accent-blue" />
                  <p className="text-xs text-foreground-subtle">{new Date(trade.createdAt).toLocaleString()}</p>
                  <p className="text-foreground-muted">Trade opened at price {trade.entryPrice.toFixed(5)}</p>
                </div>
                {trade.updatedAt !== trade.createdAt && (
                  <div className="relative">
                    <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-accent-purple" />
                    <p className="text-xs text-foreground-subtle">{new Date(trade.updatedAt).toLocaleString()}</p>
                    <p className="text-foreground-muted">Trade details modified / updated</p>
                  </div>
                )}
                {trade.exitPrice > 0 && (
                  <div className="relative">
                    <div className="absolute -left-5 top-1 w-2.5 h-2.5 rounded-full bg-accent-emerald" />
                    <p className="text-xs text-foreground-subtle">{new Date(trade.updatedAt).toLocaleString()}</p>
                    <p className="text-foreground-muted">Trade exited at price {trade.exitPrice.toFixed(5)} with P&L of {trade.pnl > 0 ? '+$' : trade.pnl < 0 ? '-$' : '$'}{Math.abs(trade.pnl).toFixed(2)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Notes & Lessons */}
            {(trade.notes || trade.lessonsLearned) && (
              <div className="rounded-2xl bg-card border border-border-subtle p-6 space-y-5">
                {trade.notes && (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-3">Notes</h3>
                    <p className="text-sm text-foreground-muted leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
                  </div>
                )}
                {trade.lessonsLearned && (
                  <div>
                    <h3 className="text-base font-semibold text-foreground mb-3">Lessons Learned</h3>
                    <div className="p-4 rounded-xl bg-accent-emerald/5 border border-accent-emerald/10">
                      <p className="text-sm text-foreground-muted leading-relaxed">{trade.lessonsLearned}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Comments Thread Section */}
            <div className="rounded-2xl bg-card border border-border-subtle p-6 space-y-6">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-accent-blue" />
                Comments & Discussions
              </h3>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add a detailed comment / review update..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="input-field flex-1"
                />
                <button type="submit" className="btn-primary py-2.5">
                  <Plus className="w-4 h-4" />
                  Comment
                </button>
              </form>

              {/* Comment Thread List */}
              <div className="space-y-3">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] flex justify-between items-start">
                      <div>
                        <p className="text-sm text-foreground-muted leading-relaxed">{comment.content}</p>
                        <span className="text-[10px] text-foreground-subtle/60 mt-1 block">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteComment(comment.id)}
                        className="p-1 rounded text-foreground-subtle hover:text-loss hover:bg-loss/10 transition-colors"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-foreground-subtle text-center py-4">No comments on this trade yet.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
