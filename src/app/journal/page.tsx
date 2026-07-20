'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, BookOpen, Pin, Heart, Search, Calendar, Folder,
  Sparkles, FileText, Lightbulb, Brain, Star, Trash2, Link2, Tag, ChevronDown, CheckSquare, Square, X
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { useJournalStore, useTradeStore } from '@/lib/store';
import { getEmotionEmoji, getRelativeTime } from '@/lib/utils';
import { EMOTIONS, type Emotion, type JournalEntry } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';

const typeIcons: Record<string, React.ReactNode> = {
  daily: <Calendar className="w-4 h-4" />,
  weekly: <FileText className="w-4 h-4" />,
  monthly: <BookOpen className="w-4 h-4" />,
  reflection: <Brain className="w-4 h-4" />,
  lesson: <Sparkles className="w-4 h-4" />,
  idea: <Lightbulb className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  daily: 'text-accent-blue bg-accent-blue/10',
  weekly: 'text-accent-purple bg-accent-purple/10',
  monthly: 'text-accent-emerald bg-accent-emerald/10',
  reflection: 'text-yellow-500 bg-yellow-500/10',
  lesson: 'text-accent-cyan bg-accent-cyan/10',
  idea: 'text-pink-400 bg-pink-400/10',
};

const slashCommands = [
  { label: 'Heading 1', text: '# ', desc: 'Large title section' },
  { label: 'Heading 2', text: '## ', desc: 'Medium section heading' },
  { label: 'Checklist', text: '- [ ] ', desc: 'Create to-do items' },
  { label: 'Bullet List', text: '- ', desc: 'Simple bullet point' },
  { label: 'Code Block', text: '```\n\n```', desc: 'Code formatting block' },
  { label: 'Quote', text: '> ', desc: 'Add a block quote' },
];

export default function JournalPage() {
  const { entries, addEntry, updateEntry, togglePin, toggleFavorite, deleteEntry } = useJournalStore();
  const trades = useTradeStore((s) => s.trades);

  const [search, setSearch] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  // Editor states
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<Emotion>('Calm');
  const [entryType, setEntryType] = useState<JournalEntry['type']>('daily');
  const [entryFolder, setEntryFolder] = useState('General');
  const [entryTags, setEntryTags] = useState<string[]>([]);
  const [selectedTradeIds, setSelectedTradeIds] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Dropdown menus
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashSearch, setSlashSearch] = useState('');
  const [slashCoords, setSlashCoords] = useState({ top: 0, left: 0 });
  const [showTradeDropdown, setShowTradeDropdown] = useState(false);

  const contentRef = useRef<HTMLTextAreaElement>(null);

  // Folders list
  const folders = useMemo(() => {
    const list = new Set<string>(['General', 'Reviews', 'Strategies', 'Lessons']);
    entries.forEach((e) => {
      if (e.folder) list.add(e.folder);
    });
    return Array.from(list);
  }, [entries]);

  // Filters
  const filteredEntries = useMemo(() => {
    let result = [...entries];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedFolder) {
      result = result.filter((e) => e.folder === selectedFolder);
    }
    if (selectedType) {
      result = result.filter((e) => e.type === selectedType);
    }
    return result;
  }, [entries, search, selectedFolder, selectedType]);

  const pinnedEntries = filteredEntries.filter((e) => e.isPinned);
  const otherEntries = filteredEntries.filter((e) => !e.isPinned);

  // Load selected entry details
  const handleSelectEntry = (entry: JournalEntry) => {
    setActiveEntryId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setMood(entry.mood);
    setEntryType(entry.type);
    setEntryFolder(entry.folder || 'General');
    setEntryTags(entry.tags || []);
    setSelectedTradeIds(entry.tradeIds || []);
  };

  const handleCreateNewEntry = () => {
    const defaultTitle = `Journal Entry - ${new Date().toLocaleDateString()}`;
    const newEntryObj = {
      title: defaultTitle,
      content: '',
      mood: 'Calm' as Emotion,
      type: 'daily' as const,
      tags: [],
      isPinned: false,
      isFavorite: false,
      tradeIds: [],
      folder: selectedFolder || 'General',
      date: new Date().toISOString(),
    };
    addEntry(newEntryObj);
    toast.success('New entry created');
  };

  // Autosave when changes occur
  useEffect(() => {
    if (!activeEntryId) return;
    const active = entries.find(e => e.id === activeEntryId);
    if (!active) return;

    // Trigger update if different
    if (
      active.title !== title ||
      active.content !== content ||
      active.mood !== mood ||
      active.type !== entryType ||
      active.folder !== entryFolder ||
      JSON.stringify(active.tags) !== JSON.stringify(entryTags) ||
      JSON.stringify(active.tradeIds) !== JSON.stringify(selectedTradeIds)
    ) {
      const delay = setTimeout(() => {
        updateEntry(activeEntryId, {
          title,
          content,
          mood,
          type: entryType,
          folder: entryFolder,
          tags: entryTags,
          tradeIds: selectedTradeIds,
        });
      }, 800); // 800ms debounce
      return () => clearTimeout(delay);
    }
  }, [title, content, mood, entryType, entryFolder, entryTags, selectedTradeIds, activeEntryId, entries, updateEntry]);

  // Slash commands trigger
  const handleContentKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === '/') {
      const { selectionStart } = e.currentTarget;
      const coords = getSelectionCoords(e.currentTarget, selectionStart);
      setSlashCoords(coords);
      setShowSlashMenu(true);
    } else if (e.key === 'Escape') {
      setShowSlashMenu(false);
    }
  };

  const insertSlashCommand = (cmdText: string) => {
    if (!contentRef.current) return;
    const ta = contentRef.current;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const currentText = ta.value;

    // Replace the "/" trigger with the command text
    const updated = currentText.substring(0, start - 1) + cmdText + currentText.substring(end);
    setContent(updated);
    setShowSlashMenu(false);

    // Reposition cursor
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start - 1 + cmdText.length;
    }, 10);
  };

  const getSelectionCoords = (textarea: HTMLTextAreaElement, selectionStart: number) => {
    // Return relative placement offset coordinates
    return {
      top: textarea.offsetHeight > 200 ? 120 : 60,
      left: 10
    };
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !entryTags.includes(newTagInput.trim())) {
      setEntryTags([...entryTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEntryTags(entryTags.filter(t => t !== tag));
  };

  const toggleTradeReference = (id: string) => {
    setSelectedTradeIds(curr =>
      curr.includes(id) ? curr.filter(item => item !== id) : [...curr, id]
    );
  };

  return (
    <AppLayout>
      <div className="max-w-[1440px] mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-8rem)]">
        
        {/* Left Side: Navigation (Folders + Entries List) */}
        <div className="lg:col-span-1 space-y-6">
          {/* Folders */}
          <div className="rounded-2xl bg-card border border-border-subtle p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-foreground-subtle uppercase tracking-wider mb-2">
              <span>Folders</span>
              <button onClick={() => {
                const fName = window.prompt('Enter folder name:');
                if (fName) setEntryFolder(fName);
              }}>
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setSelectedFolder(null)}
              className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all ${
                selectedFolder === null ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-foreground-subtle hover:text-foreground'
              }`}
            >
              <Folder className="w-4 h-4" />
              All Entries
            </button>
            {folders.map(f => (
              <button
                key={f}
                onClick={() => setSelectedFolder(f)}
                className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded-lg text-sm transition-all capitalize ${
                  selectedFolder === f ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-foreground-subtle hover:text-foreground'
                }`}
              >
                <Folder className="w-4 h-4" />
                {f}
              </button>
            ))}
          </div>

          {/* Type Filters */}
          <div className="flex flex-wrap gap-1">
            {(['daily', 'weekly', 'monthly', 'reflection', 'lesson', 'idea'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(selectedType === type ? null : type)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all capitalize ${
                  selectedType === type ? typeColors[type] + ' font-semibold' : 'bg-card text-foreground-subtle border border-border-subtle hover:text-foreground'
                }`}
              >
                {typeIcons[type]}
                {type}
              </button>
            ))}
          </div>

          {/* Search & Entry List */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-subtle" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-9 py-1.5 text-xs"
              />
            </div>

            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              <button
                onClick={handleCreateNewEntry}
                className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-border-subtle rounded-xl text-xs text-foreground-subtle hover:text-foreground hover:border-foreground-subtle transition-all"
              >
                <Plus className="w-4 h-4" /> Add Note
              </button>

              {/* Pinned Entries list */}
              {pinnedEntries.map(e => (
                <div
                  key={e.id}
                  onClick={() => handleSelectEntry(e)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    activeEntryId === e.id ? 'bg-accent-blue/5 border-accent-blue' : 'bg-card border-border-subtle'
                  }`}
                >
                  <div className="flex items-center gap-1 text-[10px] text-accent-blue font-semibold mb-1">
                    <Pin className="w-3 h-3 fill-current" /> PINNED
                  </div>
                  <h4 className="text-xs font-semibold text-foreground truncate">{e.title}</h4>
                  <p className="text-[10px] text-foreground-subtle mt-0.5">{getRelativeTime(e.date)}</p>
                </div>
              ))}

              {/* Other Entries list */}
              {otherEntries.map(e => (
                <div
                  key={e.id}
                  onClick={() => handleSelectEntry(e)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    activeEntryId === e.id ? 'bg-accent-blue/5 border-accent-blue' : 'bg-card border-border-subtle'
                  }`}
                >
                  <h4 className="text-xs font-semibold text-foreground truncate">{e.title}</h4>
                  <p className="text-[10px] text-foreground-subtle mt-0.5">{getRelativeTime(e.date)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Notion-like Rich Editor Panel */}
        <div className="lg:col-span-3 rounded-2xl bg-card border border-border-subtle p-6 flex flex-col justify-between relative min-h-[450px]">
          {activeEntryId ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              
              {/* Header row metadata */}
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${typeColors[entryType]}`}>
                    {typeIcons[entryType]}
                  </div>
                  <div>
                    <select
                      value={entryType}
                      onChange={(e) => setEntryType(e.target.value as any)}
                      className="text-xs font-semibold text-foreground bg-transparent border-none outline-none cursor-pointer capitalize"
                    >
                      <option value="daily">daily</option>
                      <option value="weekly">weekly</option>
                      <option value="monthly">monthly</option>
                      <option value="reflection">reflection</option>
                      <option value="lesson">lesson</option>
                      <option value="idea">idea</option>
                    </select>
                    <select
                      value={entryFolder}
                      onChange={(e) => setEntryFolder(e.target.value)}
                      className="text-[10px] text-foreground-subtle bg-transparent border-none outline-none cursor-pointer block mt-0.5"
                    >
                      {folders.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePin(activeEntryId)}
                    className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                      entries.find(e => e.id === activeEntryId)?.isPinned ? 'text-accent-blue' : 'text-foreground-subtle'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleFavorite(activeEntryId)}
                    className={`p-1.5 rounded-lg hover:bg-white/5 transition-colors ${
                      entries.find(e => e.id === activeEntryId)?.isFavorite ? 'text-yellow-500' : 'text-foreground-subtle'
                    }`}
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Delete this entry?')) {
                        deleteEntry(activeEntryId);
                        setActiveEntryId(null);
                        toast.success('Journal entry deleted');
                      }
                    }}
                    className="p-1.5 rounded-lg hover:bg-loss/10 text-foreground-subtle hover:text-loss transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Title Input */}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Untitled Note"
                className="w-full text-2xl font-bold text-foreground bg-transparent outline-none border-none placeholder:text-foreground-subtle/30"
              />

              {/* Mood picker */}
              <div className="flex flex-wrap items-center gap-2 py-2">
                <span className="text-xs text-foreground-subtle">Mood Check-in:</span>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTIONS.slice(0, 8).map((emotion) => (
                    <button
                      key={emotion}
                      onClick={() => setMood(emotion)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-all ${
                        mood === emotion
                          ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30 font-semibold'
                          : 'bg-white/[0.03] text-foreground-subtle border border-transparent hover:bg-white/[0.06]'
                      }`}
                    >
                      {getEmotionEmoji(emotion)} {emotion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trades reference selection dropdown */}
              <div className="relative border-b border-white/[0.04] pb-4">
                <button
                  type="button"
                  onClick={() => setShowTradeDropdown(!showTradeDropdown)}
                  className="flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-foreground bg-white/[0.02] border border-border-subtle px-3 py-1.5 rounded-xl transition-all"
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Link Trade References ({selectedTradeIds.length})</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {showTradeDropdown && (
                  <div className="absolute top-10 left-0 z-30 w-64 max-h-56 overflow-y-auto bg-card border border-border-subtle p-3 rounded-xl shadow-2xl space-y-2">
                    <p className="text-[10px] font-bold text-foreground-subtle uppercase tracking-wider mb-2">Select trades to reference</p>
                    {trades.slice(0, 10).map((t) => {
                      const isChecked = selectedTradeIds.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTradeReference(t.id)}
                          className="flex items-center justify-between w-full text-left p-2 rounded-lg hover:bg-white/[0.04] text-xs transition-all"
                        >
                          <div className="flex items-center gap-2">
                            {isChecked ? <CheckSquare className="w-4 h-4 text-accent-blue" /> : <Square className="w-4 h-4 text-foreground-subtle" />}
                            <span className="font-semibold text-foreground">{t.pair}</span>
                            <span className="text-[10px] text-foreground-subtle">{t.strategy}</span>
                          </div>
                          <span className={t.pnl >= 0 ? 'text-profit' : 'text-loss'}>
                            {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(0)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected trades pills display */}
                {selectedTradeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selectedTradeIds.map(tId => {
                      const tr = trades.find(x => x.id === tId);
                      if (!tr) return null;
                      return (
                        <Link
                          key={tId}
                          href={`/trades/${tId}`}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue text-xs font-semibold transition-all"
                        >
                          <Link2 className="w-3 h-3" />
                          <span>{tr.pair} ({tr.strategy})</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Rich Content Editor with Slash Menu dropdown */}
              <div className="relative flex-1 flex flex-col pt-2">
                <textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleContentKeyDown}
                  placeholder="Tell your story... Type '/' for markdown template blocks (e.g. lists, quotes, code blocks)"
                  className="w-full flex-1 bg-transparent border-none outline-none resize-none font-mono text-sm leading-relaxed text-foreground-muted placeholder:text-foreground-subtle/30"
                />

                {/* Floating Slash Commands list */}
                {showSlashMenu && (
                  <div
                    className="absolute z-40 w-52 bg-card border border-accent-blue/30 rounded-xl shadow-2xl p-2 space-y-1"
                    style={{ top: slashCoords.top, left: slashCoords.left }}
                  >
                    <div className="flex items-center justify-between px-2 py-1 border-b border-white/[0.04] mb-1">
                      <span className="text-[10px] font-bold text-foreground-subtle uppercase tracking-wider">Slash Blocks</span>
                      <button onClick={() => setShowSlashMenu(false)} className="text-[10px] text-loss">Close</button>
                    </div>
                    {slashCommands.map((cmd) => (
                      <button
                        key={cmd.label}
                        onClick={() => insertSlashCommand(cmd.text)}
                        className="w-full flex flex-col text-left px-2 py-1.5 rounded-lg hover:bg-accent-blue/10 transition-all"
                      >
                        <span className="text-xs font-semibold text-foreground">{cmd.label}</span>
                        <span className="text-[9px] text-foreground-subtle">{cmd.desc}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="border-t border-white/[0.04] pt-4 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {entryTags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-purple/10 text-accent-purple text-xs font-medium"
                    >
                      #{tag}
                      <button onClick={() => handleRemoveTag(tag)}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    placeholder="Add tag..."
                    className="input-field py-1 px-3 text-xs w-40"
                  />
                  <button type="button" onClick={handleAddTag} className="btn-secondary py-1 px-3 text-xs flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    <span>Tag</span>
                  </button>
                </div>
              </div>

              {/* Autosave status indicator */}
              <div className="flex justify-end text-[10px] text-foreground-subtle/50 mt-2 font-mono">
                ✓ Draft saved automatically
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center flex-1">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.03] flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-foreground-subtle/40" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">Select an entry or add a new one</h3>
              <p className="text-xs text-foreground-subtle max-w-xs">Use the list on the left to write daily journals, strategies or weekly review notes.</p>
              <button onClick={handleCreateNewEntry} className="btn-primary mt-4 py-2">
                <Plus className="w-4 h-4" /> Create First Note
              </button>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
