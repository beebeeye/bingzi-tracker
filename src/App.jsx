import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Minus,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
const WEEKDAY_SHORT = ['一', '二', '三', '四', '五', '六', '日'];
const STORAGE_HISTORY = 'bingzi_focus_history';
const STORAGE_BLOCKS = 'bingzi_focus_blocks';
const BASE_WEIGHT = 1;
const WEIGHT_PER_BLOCK = 0.1;
const BLOCKS_PER_DAY = 24 * 4;
const DAYS_PER_WEEK = 7;
const BLOCKS_PER_WEEK = BLOCKS_PER_DAY * DAYS_PER_WEEK;
const MAX_WEIGHT = BASE_WEIGHT + 24 * 0.1 * 4 * DAYS_PER_WEEK;

const MONSTER_PALETTES = [
  { body: '#FCD34D', blush: '#F87171', leaf: '#10B981' },
  { body: '#FB923C', blush: '#F472B6', leaf: '#34D399' },
  { body: '#A3E635', blush: '#FB7185', leaf: '#22C55E' },
  { body: '#67E8F9', blush: '#F472B6', leaf: '#10B981' },
  { body: '#C4B5FD', blush: '#FB7185', leaf: '#34D399' },
  { body: '#F9A8D4', blush: '#FB7185', leaf: '#22C55E' },
  { body: '#FDE68A', blush: '#F87171', leaf: '#14B8A6' },
];

function monsterPaletteForWeek(weekStartKey) {
  let hash = 0;
  for (let i = 0; i < weekStartKey.length; i += 1) {
    hash = (hash * 31 + weekStartKey.charCodeAt(i)) >>> 0;
  }
  return MONSTER_PALETTES[hash % MONSTER_PALETTES.length];
}

function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(date, n) {
  const next = new Date(date);
  next.setDate(next.getDate() + n);
  return next;
}

function startOfWeekMonday(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDateLabel(date) {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDuration(blockCount) {
  const mins = blockCount * 15;
  return `${Math.floor(mins / 60)} hrs ${mins % 60} mins`;
}

function shiftDateKey(dateKey, days) {
  return toDateKey(addDays(parseDateKey(dateKey), days));
}

function clampDayBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.slice(0, BLOCKS_PER_DAY);
}

function msUntilNextLocalMidnight(from = new Date()) {
  const next = new Date(from);
  next.setHours(24, 0, 0, 0);
  return Math.max(1, next.getTime() - from.getTime());
}

function HourCircles({ blocks, onOpenNote, onAddEmpty, atDailyCap }) {
  const filledCount = blocks.length;
  const totalCirclesNeeded = atDailyCap
    ? Math.ceil(BLOCKS_PER_DAY / 4)
    : Math.max(1, Math.ceil((filledCount + 1) / 4));
  const circles = Array.from({ length: totalCirclesNeeded }, (_, circleIdx) => {
    const quarters = Array.from({ length: 4 }, (_, quarterIdx) => {
      const blockIndex = circleIdx * 4 + quarterIdx;
      return blocks[blockIndex] || null;
    });
    return { circleIdx, quarters };
  });

  return (
    <div className="flex flex-wrap justify-center gap-6 mb-8 max-h-[320px] overflow-y-auto p-2 w-full">
      {circles.map(({ circleIdx, quarters }) => (
        <div key={circleIdx} className="flex flex-col items-center gap-1.5">
          <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-slate-300 flex flex-wrap p-1 bg-slate-50/50 shadow-inner">
            {quarters.map((block, qIdx) => {
              const nth = qIdx + 1;
              const foldX = nth % 2 === 0;
              const foldY = nth % 3 === 0 || nth % 4 === 0;

              return (
                <div key={qIdx} className="w-1/2 h-1/2 p-0.5">
                  <div
                    className="w-full h-full"
                    style={{ transform: `scale(${foldX ? -1 : 1}, ${foldY ? -1 : 1})` }}
                  >
                    {block ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onOpenNote(block.id, block.note)}
                        title={block.note ? `备注: ${block.note}` : '点击添加备注'}
                        className="w-full h-full bg-amber-400 hover:bg-amber-500 transition-colors rounded-tl-full flex items-center justify-center relative group shadow-sm"
                      >
                        {block.note && (
                          <span className="w-2 h-2 rounded-full bg-amber-800 absolute" />
                        )}
                      </motion.button>
                    ) : (
                      <div
                        onClick={atDailyCap ? undefined : onAddEmpty}
                        className={`w-full h-full rounded-tl-full ${
                          atDailyCap
                            ? 'cursor-default'
                            : 'cursor-pointer hover:bg-slate-200/50 transition-colors'
                        }`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <span className="text-xs font-medium text-slate-400">1h</span>
        </div>
      ))}
    </div>
  );
}

export default function FocusTrackerApp() {
  const [history, setHistory] = useState({});
  const [activeModalBlockId, setActiveModalBlockId] = useState(null);
  const [tempNote, setTempNote] = useState('');
  const [feedAction, setFeedAction] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [viewMode, setViewMode] = useState('day');
  const [viewDateKey, setViewDateKey] = useState(() => toDateKey(new Date()));
  const [todayKey, setTodayKey] = useState(() => toDateKey(new Date()));
  const [frameWidth, setFrameWidth] = useState(448);
  const recordFrameRef = useRef(null);
  const feedTimerRef = useRef(null);
  const midnightTimerRef = useRef(null);
  const todayKeyRef = useRef(todayKey);

  const isToday = viewDateKey === todayKey;

  useEffect(() => {
    todayKeyRef.current = todayKey;
  }, [todayKey]);

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_HISTORY);
    const savedBlocks = localStorage.getItem(STORAGE_BLOCKS);
    let hist = {};

    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          hist = parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }

    const currentTodayKey = toDateKey(new Date());

    // Dated draft only restores today's blocks. Undated leftover lists are ignored
    // so yesterday never becomes today's starting total.
    if (savedBlocks && !Array.isArray(hist[currentTodayKey])) {
      try {
        const parsed = JSON.parse(savedBlocks);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          parsed.date === currentTodayKey &&
          Array.isArray(parsed.blocks)
        ) {
          hist = { ...hist, [currentTodayKey]: clampDayBlocks(parsed.blocks) };
        } else if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          Object.keys(hist).length === 0
        ) {
          hist = { [currentTodayKey]: clampDayBlocks(parsed) };
        }
      } catch (e) {
        console.error(e);
      }
    }

    const normalized = {};
    Object.entries(hist).forEach(([key, dayBlocks]) => {
      normalized[key] = clampDayBlocks(dayBlocks);
    });
    if (!Array.isArray(normalized[currentTodayKey])) {
      normalized[currentTodayKey] = [];
    }

    setHistory(normalized);
    setTodayKey(currentTodayKey);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_HISTORY, JSON.stringify(history));
    localStorage.setItem(
      STORAGE_BLOCKS,
      JSON.stringify({ date: todayKey, blocks: history[todayKey] || [] })
    );
  }, [history, hydrated, todayKey]);

  useEffect(() => {
    const rollToToday = () => {
      const nextTodayKey = toDateKey(new Date());
      const prevToday = todayKeyRef.current;
      if (prevToday === nextTodayKey) return;
      todayKeyRef.current = nextTodayKey;
      setTodayKey(nextTodayKey);
      setHistory(prev =>
        Array.isArray(prev[nextTodayKey]) ? prev : { ...prev, [nextTodayKey]: [] }
      );
      setViewDateKey(current => (current === prevToday ? nextTodayKey : current));
    };

    const scheduleMidnightReset = () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      midnightTimerRef.current = setTimeout(() => {
        rollToToday();
        scheduleMidnightReset();
      }, msUntilNextLocalMidnight());
    };

    scheduleMidnightReset();
    const onVisible = () => {
      if (document.visibilityState === 'visible') rollToToday();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', rollToToday);

    return () => {
      if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', rollToToday);
    };
  }, []);

  useEffect(() => {
    const el = recordFrameRef.current;
    if (!el) return undefined;
    const updateFrameWidth = () => {
      const width = el.getBoundingClientRect().width;
      if (width > 0) setFrameWidth(width);
    };
    updateFrameWidth();
    const observer = new ResizeObserver(updateFrameWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (feedTimerRef.current) clearTimeout(feedTimerRef.current);
    };
  }, []);

  const blocks = history[viewDateKey] || [];
  const filledCount = blocks.length;

  const playFeedAction = action => {
    setFeedAction(action);
    if (feedTimerRef.current) clearTimeout(feedTimerRef.current);
    feedTimerRef.current = setTimeout(() => setFeedAction(null), 700);
  };

  const updateBlocks = updater => {
    setHistory(prev => {
      const current = prev[viewDateKey] || [];
      const next = typeof updater === 'function' ? updater(current) : updater;
      return { ...prev, [viewDateKey]: clampDayBlocks(next) };
    });
  };

  const viewDate = parseDateKey(viewDateKey);
  const dateString = formatDateLabel(viewDate);
  const dayOfWeek = WEEKDAYS[viewDate.getDay()];

  const weekStart = startOfWeekMonday(viewDate);
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStart, i);
      const key = toDateKey(date);
      const dayBlocks = history[key] || [];
      return {
        key,
        date,
        label: WEEKDAY_SHORT[i],
        count: dayBlocks.length,
        minutes: dayBlocks.length * 15,
        isToday: key === todayKey,
        isFuture: key > todayKey,
      };
    });
  }, [history, todayKey, weekStart]);

  const weekTotalBlocks = weekDays.reduce((sum, d) => sum + d.count, 0);
  const recordedDays = weekDays.filter(d => d.count > 0).length;
  const maxWeekMinutes = Math.max(60, ...weekDays.map(d => d.minutes));
  const currentWeekStartKey = toDateKey(startOfWeekMonday(new Date()));
  const weekStartKey = toDateKey(weekStart);
  const canGoNextWeek = weekStartKey < currentWeekStartKey;
  const canGoNextDay = viewDateKey < todayKey;
  const isCurrentWeek = weekStartKey === currentWeekStartKey;

  const monsterWeight = parseFloat(
    Math.min(BASE_WEIGHT + weekTotalBlocks * WEIGHT_PER_BLOCK, MAX_WEIGHT).toFixed(1)
  );
  const minMonsterSize = frameWidth / 10;
  const maxMonsterSize = frameWidth;
  const growth = Math.min(weekTotalBlocks / BLOCKS_PER_WEEK, 1);
  const monsterSize = minMonsterSize + growth * (maxMonsterSize - minMonsterSize);
  const monsterScale = minMonsterSize > 0 ? monsterSize / minMonsterSize : 1;
  const monsterPalette = monsterPaletteForWeek(weekStartKey);

  const atDailyCap = filledCount >= BLOCKS_PER_DAY;

  const handleAdd15Min = () => {
    if (atDailyCap) return;
    const newBlock = {
      id: Date.now() + Math.random(),
      note: '',
    };
    updateBlocks(prev => (prev.length >= BLOCKS_PER_DAY ? prev : [...prev, newBlock]));
    playFeedAction('eat');
  };

  const handleMinus15Min = () => {
    if (blocks.length === 0) return;
    updateBlocks(prev => prev.slice(0, prev.length - 1));
    playFeedAction('spit');
  };

  const openNoteModal = (id, currentNote) => {
    setActiveModalBlockId(id);
    setTempNote(currentNote || '');
  };

  const saveNote = () => {
    updateBlocks(prev =>
      prev.map(b => (b.id === activeModalBlockId ? { ...b, note: tempNote } : b))
    );
    setActiveModalBlockId(null);
  };

  const goPrevDay = () => setViewDateKey(prev => shiftDateKey(prev, -1));
  const goNextDay = () => {
    if (!canGoNextDay) return;
    setViewDateKey(prev => shiftDateKey(prev, 1));
  };
  const goToday = () => setViewDateKey(todayKey);

  const goPrevWeek = () => setViewDateKey(prev => shiftDateKey(toDateKey(startOfWeekMonday(parseDateKey(prev))), -7));
  const goNextWeek = () => {
    if (!canGoNextWeek) return;
    const next = toDateKey(addDays(weekStart, 7));
    setViewDateKey(next > todayKey ? todayKey : next);
  };

  const weekRangeLabel = `${formatDateLabel(weekStart)} – ${formatDateLabel(addDays(weekStart, 6))}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      <header className="w-full max-w-md text-center my-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">饼子专注工作时间记录器</h1>

        <div className="mt-3 inline-flex rounded-full bg-slate-100 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              viewMode === 'day' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            日记录
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              viewMode === 'week' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            周统计
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
          <button
            type="button"
            onClick={viewMode === 'day' ? goPrevDay : goPrevWeek}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600"
            aria-label={viewMode === 'day' ? '前一天' : '上一周'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="min-w-[210px]">
            {viewMode === 'day' ? (
              <>
                {dateString} <span className="mx-1">•</span> {dayOfWeek}
                {!isToday && <span className="ml-1 text-amber-600">（往日）</span>}
              </>
            ) : (
              <span>{weekRangeLabel}</span>
            )}
          </div>
          <button
            type="button"
            onClick={viewMode === 'day' ? goNextDay : goNextWeek}
            disabled={viewMode === 'day' ? !canGoNextDay : !canGoNextWeek}
            className={`p-1.5 rounded-full ${
              (viewMode === 'day' ? canGoNextDay : canGoNextWeek)
                ? 'hover:bg-slate-200 text-slate-600'
                : 'text-slate-300 cursor-not-allowed'
            }`}
            aria-label={viewMode === 'day' ? '后一天' : '下一周'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {viewMode === 'day' && !isToday && (
          <button
            type="button"
            onClick={goToday}
            className="mt-2 text-xs text-amber-600 hover:text-amber-700 font-medium"
          >
            回到今天
          </button>
        )}
      </header>

      <main
        ref={recordFrameRef}
        data-record-frame="true"
        className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center flex-1 justify-center my-2"
      >
        {viewMode === 'day' ? (
          <>
            <HourCircles
              blocks={blocks}
              onOpenNote={openNoteModal}
              onAddEmpty={handleAdd15Min}
              atDailyCap={atDailyCap}
            />

            <div className="flex items-center gap-4">
              {filledCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={handleMinus15Min}
                  className="flex items-center justify-center w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all shadow-sm"
                  aria-label="-"
                >
                  <Minus className="w-5 h-5" />
                </motion.button>
              )}

              <motion.button
                whileTap={atDailyCap ? undefined : { scale: 0.95 }}
                onClick={handleAdd15Min}
                disabled={atDailyCap}
                className={`flex items-center justify-center w-12 h-12 rounded-full shadow-md transition-all ${
                  atDailyCap
                    ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                }`}
                aria-label="+"
                title={atDailyCap ? '当天累计已达 24 小时' : undefined}
              >
                <Plus className="w-5 h-5" />
              </motion.button>
            </div>

            <div className="mt-4 text-xs font-semibold text-slate-500">
              {isToday ? '今日累计专注' : '当日累计专注'}:{' '}
              <span className="text-amber-600 text-sm font-bold">
                {formatDuration(filledCount)}
              </span>
              {atDailyCap && (
                <div className="mt-1 text-[11px] font-medium text-slate-400">当天累计已达上限 24 小时</div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full">
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="rounded-2xl bg-amber-50 px-3 py-3 text-center">
                <div className="text-[10px] text-amber-700/70 font-medium">本周累计</div>
                <div className="mt-1 text-sm font-bold text-amber-700">{formatDuration(weekTotalBlocks)}</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                <div className="text-[10px] text-slate-400 font-medium">有记录天数</div>
                <div className="mt-1 text-sm font-bold text-slate-700">{recordedDays} / 7</div>
              </div>
              <div className="rounded-2xl bg-slate-50 px-3 py-3 text-center">
                <div className="text-[10px] text-slate-400 font-medium">日均</div>
                <div className="mt-1 text-sm font-bold text-slate-700">
                  {formatDuration(recordedDays ? Math.round(weekTotalBlocks / recordedDays) : 0)}
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {weekDays.map(day => (
                <button
                  key={day.key}
                  type="button"
                  disabled={day.isFuture}
                  onClick={() => {
                    if (day.isFuture) return;
                    setViewDateKey(day.key);
                    setViewMode('day');
                  }}
                  className={`w-full flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${
                    day.isFuture
                      ? 'opacity-40 cursor-not-allowed'
                      : day.key === viewDateKey
                        ? 'bg-amber-50 hover:bg-amber-100'
                        : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="w-10 shrink-0">
                    <div className="text-xs font-bold text-slate-700">周{day.label}</div>
                    <div className="text-[10px] text-slate-400">
                      {String(day.date.getMonth() + 1).padStart(2, '0')}/{String(day.date.getDate()).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${day.count > 0 ? 'bg-amber-400' : 'bg-transparent'}`}
                      style={{ width: `${(day.minutes / maxWeekMinutes) * 100}%` }}
                    />
                  </div>
                  <div className="w-[88px] text-right text-xs font-semibold text-slate-600">
                    {day.isFuture ? '—' : formatDuration(day.count)}
                  </div>
                </button>
              ))}
            </div>

            {weekTotalBlocks === 0 && (
              <p className="mt-4 text-center text-xs text-slate-400">这一周还没有记录</p>
            )}
          </div>
        )}
      </main>

      <footer className="w-full max-w-md bg-white rounded-3xl py-5 shadow-sm border border-slate-100 flex flex-col items-center overflow-hidden">
        <div
          className="relative w-full flex items-center justify-center overflow-hidden"
          style={{ height: `${Math.max(minMonsterSize + 24, monsterSize + 24)}px` }}
        >
          <motion.div
            animate={
              feedAction === 'eat'
                ? { y: [0, -6, 0], rotate: [0, -8, 8, -3, 0] }
                : feedAction === 'spit'
                  ? { y: [0, 6, 0], rotate: [0, 8, -8, 3, 0] }
                  : { y: [0, -4, 0] }
            }
            transition={
              feedAction
                ? { duration: 0.65, ease: 'easeInOut' }
                : { repeat: Infinity, duration: 3, ease: 'easeInOut' }
            }
          >
            <motion.svg
              key={weekStartKey}
              viewBox="0 0 100 100"
              className="drop-shadow-md"
              data-monster-scale={monsterScale}
              data-monster-week={weekStartKey}
              animate={{ width: monsterSize, height: monsterSize }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              style={{ width: monsterSize, height: monsterSize }}
            >
              <circle cx="50" cy="50" r="42" fill={monsterPalette.body} />
              <circle cx="30" cy="55" r="6" fill={monsterPalette.blush} opacity="0.4" />
              <circle cx="70" cy="55" r="6" fill={monsterPalette.blush} opacity="0.4" />
              <circle cx="36" cy="45" r="4" fill="#1E293B" />
              <circle cx="64" cy="45" r="4" fill="#1E293B" />
              <circle cx="37.5" cy="43.5" r="1.5" fill="#FFFFFF" />
              <circle cx="65.5" cy="43.5" r="1.5" fill="#FFFFFF" />
              {feedAction ? (
                <path d="M 40 58 Q 50 72 60 58 Z" fill="#1E293B" />
              ) : (
                <path d="M 42 58 Q 50 64 58 58" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
              )}
              <path d="M 50 8 Q 45 0 40 4" stroke={monsterPalette.leaf} strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 50 8 Q 55 0 60 4" stroke={monsterPalette.leaf} strokeWidth="3" strokeLinecap="round" fill="none" />
            </motion.svg>
          </motion.div>

          <AnimatePresence>
            {feedAction === 'eat' && (
              <motion.div
                key="pie-in"
                initial={{ opacity: 1, y: -42, x: -28, scale: 1, rotate: -20 }}
                animate={{ opacity: 0, y: 6, x: 0, scale: 0.35, rotate: 10 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeIn' }}
                className="absolute pointer-events-none"
              >
                <div className="w-8 h-8 bg-amber-400 rounded-tl-full shadow-sm" />
              </motion.div>
            )}
            {feedAction === 'spit' && (
              <motion.div
                key="pie-out"
                initial={{ opacity: 1, y: 4, x: 0, scale: 0.4, rotate: 0 }}
                animate={{ opacity: 0, y: -46, x: 32, scale: 1, rotate: 25 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className="absolute pointer-events-none"
              >
                <div className="w-8 h-8 bg-amber-400 rounded-tl-full shadow-sm" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-full mt-1 flex flex-col items-center border-t border-slate-100 pt-3 px-4">
          <span className="text-xs text-slate-400">
            {isCurrentWeek ? '本周小怪物体重' : '当周小怪物体重'}
          </span>
          <span className="text-lg font-bold text-slate-700">
            {monsterWeight.toFixed(1)} <span className="text-xs font-normal">kg</span>
          </span>
        </div>
      </footer>

      <AnimatePresence>
        {activeModalBlockId && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl p-5 w-full max-w-xs shadow-xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-800">15分钟区块备注</h3>
                <button
                  onClick={() => setActiveModalBlockId(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                autoFocus
                placeholder="例如：撰写文档、思考方案..."
                value={tempNote}
                onChange={e => setTempNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveNote()}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setActiveModalBlockId(null)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={saveNote}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg shadow-sm transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  保存
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
