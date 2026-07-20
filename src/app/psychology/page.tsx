'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, Smile, AlertTriangle, Shield, TrendingUp, Target, Flame, Plus, Trash2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useTradeStore, useHabitsStore, useMoodStore } from '@/lib/store';
import { getEmotionEmoji } from '@/lib/utils';
import { toast } from 'sonner';
import { Emotion, EMOTIONS } from '@/lib/types';

function ScoreRing({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = (value / max) * 100;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-foreground">{value}</span>
        </div>
      </div>
      <span className="text-xs text-foreground-subtle mt-2">{label}</span>
    </div>
  );
}

export default function PsychologyPage() {
  const trades = useTradeStore((s) => s.trades);
  const getStats = useTradeStore((s) => s.getStats);
  const stats = getStats();

  const { habits, addHabit, toggleHabit, deleteHabit } = useHabitsStore();
  const { moodEntries, addMoodEntry, deleteMoodEntry } = useMoodStore();

  const [newHabitText, setNewHabitText] = useState('');

  // Daily reflection input logger
  const [moodInput, setMoodInput] = useState<Emotion>('Calm');
  const [reflectionInput, setReflectionInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [disciplineInput, setDisciplineInput] = useState(8);
  const [fearInput, setFearInput] = useState(2);
  const [greedInput, setGreedInput] = useState(2);
  const [confidenceInput, setConfidenceInput] = useState(8);

  const activeTrades = useMemo(() => trades.filter(t => !t.isArchived), [trades]);

  // Mistakes aggregation
  const mistakeTrades = useMemo(() => activeTrades.filter((t) => t.isMistake), [activeTrades]);

  const emotionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    activeTrades.forEach((t) => {
      counts[t.emotionBefore] = (counts[t.emotionBefore] || 0) + 1;
      counts[t.emotionDuring] = (counts[t.emotionDuring] || 0) + 1;
      counts[t.emotionAfter] = (counts[t.emotionAfter] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [activeTrades]);

  // Scores
  const disciplinedCount = activeTrades.filter(
    (t) => t.emotionBefore === 'Calm' || t.emotionBefore === 'Confident' || t.emotionBefore === 'Disciplined'
  ).length;
  const fearCount = activeTrades.filter((t) => t.emotionBefore === 'Fearful' || t.emotionBefore === 'Anxious').length;
  const greedCount = activeTrades.filter((t) => t.emotionBefore === 'Greedy' || t.emotionBefore === 'FOMO').length;

  const disciplineScore = activeTrades.length > 0 ? Math.round((disciplinedCount / activeTrades.length) * 10) : 5;
  const fearScore = activeTrades.length > 0 ? Math.min(10, Math.round((fearCount / activeTrades.length) * 10) + 2) : 3;
  const greedScore = activeTrades.length > 0 ? Math.min(10, Math.round((greedCount / activeTrades.length) * 10) + 1) : 2;
  const confidenceScore = activeTrades.length > 0
    ? Math.round(activeTrades.reduce((sum, t) => sum + t.confidenceLevel, 0) / activeTrades.length)
    : 5;

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitText.trim()) return;
    addHabit(newHabitText.trim());
    setNewHabitText('');
    toast.success('Habit added');
  };

  const handleMoodSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await addMoodEntry({
      date: new Date().toISOString(),
      mood: moodInput,
      disciplineScore: disciplineInput,
      fearScore: fearInput,
      greedScore: greedInput,
      confidenceScore: confidenceInput,
      notes: notesInput,
      reflection: reflectionInput,
    });
    setReflectionInput('');
    setNotesInput('');
    toast.success('Psychology check-in logged!');
  };

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Psychology</h2>
          <p className="text-foreground-subtle mt-1">Track habits, perform daily reflections, and observe behavioral mistakes</p>
        </motion.div>

        {/* Score Rings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border-subtle p-8"
        >
          <h3 className="text-base font-semibold text-foreground mb-6">Mindset Health Scores</h3>
          <div className="flex items-center justify-around flex-wrap gap-6">
            <ScoreRing value={disciplineScore} max={10} label="Discipline" color="#22C55E" />
            <ScoreRing value={fearScore} max={10} label="Fear Control" color="#EF4444" />
            <ScoreRing value={greedScore} max={10} label="Greed Control" color="#F59E0B" />
            <ScoreRing value={confidenceScore} max={10} label="Confidence" color="#3B82F6" />
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* Daily Psychology Reflection Prompt Logger */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-card border border-border-subtle p-6"
          >
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Brain className="w-4 h-4 text-accent-purple" />
              Daily Reflection Check-in
            </h3>
            <form onSubmit={handleMoodSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-foreground-subtle mb-2">Select Mood</label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTIONS.slice(0, 8).map((emotion) => (
                    <button
                      key={emotion}
                      type="button"
                      onClick={() => setMoodInput(emotion)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                        moodInput === emotion
                          ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-semibold'
                          : 'bg-white/[0.03] text-foreground-subtle'
                      }`}
                    >
                      {getEmotionEmoji(emotion)} {emotion}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-foreground-subtle mb-1">Discipline Score: {disciplineInput}/10</label>
                  <input type="range" min="1" max="10" value={disciplineInput} onChange={(e) => setDisciplineInput(parseInt(e.target.value))} className="w-full accent-accent-blue" />
                </div>
                <div>
                  <label className="block text-xs text-foreground-subtle mb-1">Confidence Score: {confidenceInput}/10</label>
                  <input type="range" min="1" max="10" value={confidenceInput} onChange={(e) => setConfidenceInput(parseInt(e.target.value))} className="w-full accent-accent-blue" />
                </div>
              </div>

              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Prompt: &ldquo;What rule was hardest to follow today?&rdquo;</label>
                <textarea
                  rows={2}
                  placeholder="Your thoughts..."
                  value={reflectionInput}
                  onChange={(e) => setReflectionInput(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label className="block text-xs text-foreground-subtle mb-1">Additional Notes</label>
                <textarea
                  rows={2}
                  placeholder="Notes..."
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="input-field text-xs"
                />
              </div>

              <button type="submit" className="btn-primary py-2 w-full text-xs">Save Check-in</button>
            </form>
          </motion.div>

          {/* Habits checklist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-card border border-border-subtle p-6"
          >
            <h3 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-accent-emerald" />
              Daily Habit Tracker
            </h3>

            {/* Add Habit Form */}
            <form onSubmit={handleAddHabit} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="New habit label..."
                value={newHabitText}
                onChange={(e) => setNewHabitText(e.target.value)}
                className="input-field text-xs flex-1"
              />
              <button type="submit" className="btn-secondary py-1 px-3 text-xs">Add</button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {habits.map((habit) => (
                <div key={habit.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleHabit(habit.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                        habit.done ? 'bg-accent-emerald border-accent-emerald text-white' : 'border-border'
                      }`}
                    >
                      {habit.done && <span className="text-[10px]">✓</span>}
                    </button>
                    <span className={`text-sm ${habit.done ? 'line-through text-foreground-subtle' : 'text-foreground'}`}>
                      {habit.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-yellow-500 font-bold">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{habit.streak}d</span>
                    </div>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="p-1 rounded text-foreground-subtle hover:text-loss hover:bg-loss/10 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Emotion Frequency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-card border border-border-subtle p-6"
          >
            <h3 className="text-base font-semibold text-foreground mb-5">Emotion Frequency (Before/During/After Trades)</h3>
            <div className="space-y-3">
              {emotionStats.map(([emotion, count]) => {
                const maxCount = emotionStats[0] ? (emotionStats[0][1] as number) : 1;
                const pct = (count / maxCount) * 100;
                return (
                  <div key={emotion} className="flex items-center gap-3">
                    <span className="text-xl flex-shrink-0">{getEmotionEmoji(emotion)}</span>
                    <span className="text-xs text-foreground w-20 flex-shrink-0">{emotion}</span>
                    <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="h-full rounded-full bg-accent-blue"
                      />
                    </div>
                    <span className="text-xs text-foreground-subtle w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Mistake Tracker */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-card border border-border-subtle p-6"
          >
            <h3 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-loss" />
              Mistake Tracker
            </h3>
            <div className="p-4 rounded-xl bg-loss/5 border border-loss/10 mb-4">
              <p className="text-3xl font-bold text-loss">{mistakeTrades.length}</p>
              <p className="text-xs text-foreground-subtle mt-1">trades flagged with execution mistakes</p>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {mistakeTrades.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02]">
                  <div>
                    <span className="text-sm font-medium text-foreground">{t.pair}</span>
                    <span className="text-xs text-foreground-subtle ml-2">{t.strategy}</span>
                  </div>
                  <span className="text-xs text-loss font-medium">${Math.abs(t.pnl).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* Reflection History list */}
        {moodEntries.length > 0 && (
          <div className="rounded-2xl bg-card border border-border-subtle p-6 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Psychology Reflection History</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {moodEntries.map(entry => (
                <div key={entry.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2 relative group">
                  <button
                    onClick={() => deleteMoodEntry(entry.id)}
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-foreground-subtle hover:text-loss"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{getEmotionEmoji(entry.mood)}</span>
                    <div>
                      <h4 className="text-xs font-semibold text-foreground">{entry.mood} check-in</h4>
                      <p className="text-[10px] text-foreground-subtle">{new Date(entry.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] text-foreground-subtle">
                    <span>Discipline: {entry.disciplineScore}/10</span>
                    <span>Confidence: {entry.confidenceScore}/10</span>
                  </div>
                  {entry.reflection && (
                    <p className="text-xs text-foreground-muted italic leading-relaxed">
                      &ldquo;{entry.reflection}&rdquo;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
