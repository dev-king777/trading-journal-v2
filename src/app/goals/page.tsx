'use client';

import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingUp, Shield, Flame, Plus, Check, Trash2, Award } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useTradeStore, useGoalsStore } from '@/lib/store';
import { toast } from 'sonner';

function ProgressRing({
  value, max, size = 80, strokeWidth = 6, color,
}: {
  value: number; max: number; size?: number; strokeWidth?: number; color: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = Math.min(value / max, 1) * 100;
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[11px] font-bold text-foreground">{Math.round(pct)}%</span>
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const trades = useTradeStore((s) => s.trades);
  const getStats = useTradeStore((s) => s.getStats);
  const stats = getStats();

  const { goals, addGoal, updateGoal, deleteGoal } = useGoalsStore();

  const [showAddGoalForm, setShowAddGoalForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newTarget, setNewTarget] = useState(10);
  const [newUnit, setNewUnit] = useState('$');
  const [newType, setNewType] = useState<'weekly' | 'monthly' | 'risk' | 'habit'>('monthly');

  const activeTrades = useMemo(() => trades.filter(t => !t.isArchived), [trades]);

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 30); // 30 day target limit

    await addGoal({
      title: newTitle.trim(),
      description: newDesc.trim(),
      type: newType,
      target: newTarget,
      current: 0,
      unit: newUnit,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    setNewTitle('');
    setNewDesc('');
    setNewTarget(10);
    setShowAddGoalForm(false);
    toast.success('Goal created');
  };

  // Dynamically calculate actual progression values for targets from store stats
  const resolvedGoals = useMemo(() => {
    return goals.map((goal) => {
      let currentVal = goal.current;
      
      // Overwrite current based on type
      if (goal.title.toLowerCase().includes('win rate')) {
        currentVal = stats.winRate;
      } else if (goal.title.toLowerCase().includes('profit') || goal.title.toLowerCase().includes('p&l')) {
        currentVal = Math.max(0, stats.totalPnl);
      } else if (goal.title.toLowerCase().includes('risk')) {
        currentVal = 1.5; // placeholder static logic or dynamic average
      } else if (goal.title.toLowerCase().includes('trades') || goal.type === 'weekly') {
        // filter trades within past week
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        currentVal = activeTrades.filter(t => new Date(t.date) >= weekAgo).length;
      }

      const isCompleted = currentVal >= goal.target;

      return {
        ...goal,
        current: currentVal,
        isCompleted
      };
    });
  }, [goals, stats, activeTrades]);

  // Dynamic Achievements list based on database achievements
  const achievements = useMemo(() => {
    const list = [];
    if (stats.totalTrades >= 1) {
      list.push({ title: 'First Steps', desc: 'Log your first trade', badge: '🌱' });
    }
    if (stats.totalTrades >= 30) {
      list.push({ title: 'Consistent Log', desc: 'Log 30 trades in your journal', badge: '📚' });
    }
    if (stats.totalPnl >= 500) {
      list.push({ title: 'Profitable Quarter', desc: 'Net over $500 total P&L', badge: '💰' });
    }
    if (stats.winRate >= 50 && stats.totalTrades >= 10) {
      list.push({ title: 'Sharp Shooter', desc: 'Maintain 50%+ win rate over 10+ trades', badge: '🎯' });
    }
    if (stats.bestStreak >= 5) {
      list.push({ title: 'Streak Runner', desc: 'Hit a win streak of 5 or more', badge: '🔥' });
    }
    if (stats.psychologyScore >= 80 && stats.totalTrades >= 5) {
      list.push({ title: 'Disciplined Mind', desc: 'Achieve 80%+ discipline psychology score', badge: '🧠' });
    }
    return list;
  }, [stats]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Goals</h2>
            <p className="text-foreground-subtle mt-1">Track target progressions and achievements earned</p>
          </div>
          <button onClick={() => setShowAddGoalForm(!showAddGoalForm)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Goal
          </button>
        </motion.div>

        {/* Add Goal Modal / Inline Form */}
        <AnimatePresence>
          {showAddGoalForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddGoal}
              className="rounded-2xl bg-card border border-accent-blue/30 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-foreground">Create a New Trading Goal</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-foreground-subtle mb-1">Goal Title</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Monthly P&L Target"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground-subtle mb-1">Goal Target Value</label>
                  <input
                    type="number"
                    value={newTarget}
                    onChange={(e) => setNewTarget(parseFloat(e.target.value) || 0)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground-subtle mb-1">Target Unit</label>
                  <input
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="e.g. $, %, trades"
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-foreground-subtle mb-1">Goal Description</label>
                  <input
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Describe how to achieve this target..."
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-xs text-foreground-subtle mb-1">Goal Period Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="input-field cursor-pointer"
                  >
                    <option value="weekly">Weekly Target</option>
                    <option value="monthly">Monthly Target</option>
                    <option value="risk">Risk Management</option>
                    <option value="habit">Behavioral Habits</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddGoalForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create Goal</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resolvedGoals.map((goal, i) => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl bg-card border border-border-subtle p-6 flex items-start justify-between relative group"
              >
                <div className="flex-1 mr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-accent-blue" />
                    <h3 className="text-base font-semibold text-foreground">{goal.title}</h3>
                  </div>
                  <p className="text-xs text-foreground-subtle mb-4">{goal.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-foreground">
                      {goal.unit === '$' ? `$${goal.current.toFixed(0)}` : `${goal.current.toFixed(1)}${goal.unit}`}
                    </span>
                    <span className="text-sm text-foreground-subtle">
                      / {goal.unit === '$' ? `$${goal.target}` : `${goal.target}${goal.unit}`}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-white/5 rounded-full mt-3 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1 }}
                      className="h-full rounded-full bg-accent-blue"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between h-full space-y-6">
                  <ProgressRing value={goal.current} max={goal.target} color="#3B82F6" />
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-foreground-subtle hover:text-loss transition-opacity"
                    title="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Achievements Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border-subtle p-6"
        >
          <h3 className="text-base font-semibold text-foreground mb-5 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" />
            Achievements Unlocked
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-3xl">{item.badge}</span>
                <div>
                  <h4 className="text-sm font-semibold text-foreground">{item.title}</h4>
                  <p className="text-[11px] text-foreground-subtle">{item.desc}</p>
                </div>
              </div>
            ))}
            {achievements.length === 0 && (
              <p className="text-xs text-foreground-subtle col-span-3 text-center py-4">Start trading and follow psychology rules to unlock achievements!</p>
            )}
          </div>
        </motion.div>
      </div>
    </AppLayout>
  );
}
