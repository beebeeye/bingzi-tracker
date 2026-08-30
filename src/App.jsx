import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, X, Check, Utensils } from 'lucide-react';

export default function FocusTrackerApp() {
  // ---------------- State 管理 ----------------
  const [blocks, setBlocks] = useState([]); // [{ id, note }]
  const [monsterWeight, setMonsterWeight] = useState(10); // 初始体重 10kg
  const [activeModalBlockId, setActiveModalBlockId] = useState(null);
  const [tempNote, setTempNote] = useState('');
  const [isEating, setIsEating] = useState(false);

  // ---------------- 初始化 & 本地存储 ----------------
  useEffect(() => {
    const savedBlocks = localStorage.getItem('bingzi_focus_blocks');
    const savedWeight = localStorage.getItem('bingzi_monster_weight');
    if (savedBlocks) {
      try { setBlocks(JSON.parse(savedBlocks)); } catch (e) { console.error(e); }
    }
    if (savedWeight) {
      setMonsterWeight(parseFloat(savedWeight));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('bingzi_focus_blocks', JSON.stringify(blocks));
  }, [blocks]);

  useEffect(() => {
    localStorage.setItem('bingzi_monster_weight', monsterWeight.toString());
  }, [monsterWeight]);

  // ---------------- 时间格式化 ----------------
  const today = new Date();
  const dateString = today.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const dayOfWeek = weekDays[today.getDay()];

  // ---------------- 核心逻辑：加/减 15分钟 ----------------
  const handleAdd15Min = () => {
    const newBlock = {
      id: Date.now() + Math.random(),
      note: '',
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  const handleMinus15Min = () => {
    if (blocks.length === 0) return;
    setBlocks(prev => prev.slice(0, prev.length - 1));
  };

  // ---------------- Modal 逻辑 ----------------
  const openNoteModal = (id, currentNote) => {
    setActiveModalBlockId(id);
    setTempNote(currentNote || '');
  };

  const saveNote = () => {
    setBlocks(prev =>
      prev.map(b => (b.id === activeModalBlockId ? { ...b, note: tempNote } : b))
    );
    setActiveModalBlockId(null);
  };

  // ---------------- 模拟结算喂食 ----------------
  const handleFeedMonster = () => {
    if (blocks.length === 0) return;
    
    // 计算当前新增体重 (1小时 = 4个区块 = 1kg)
    const addedWeight = blocks.length * 0.25;
    
    // 触发动画
    setIsEating(true);
    
    setTimeout(() => {
      setMonsterWeight(prev => parseFloat((prev + addedWeight).toFixed(2)));
      setIsEating(false);
    }, 800);
  };

  // ---------------- 渲染计算 ----------------
  // 计算总圆数（至少保持 1 个空圆展现）
  const filledCount = blocks.length;
  const minCircles = 1;
  const totalCirclesNeeded = Math.max(minCircles, Math.ceil((filledCount + 1) / 4));
  
  // 生成渲染用圆阵列
  const circles = Array.from({ length: totalCirclesNeeded }, (_, circleIdx) => {
    const quarters = Array.from({ length: 4 }, (_, quarterIdx) => {
      const blockIndex = circleIdx * 4 + quarterIdx;
      return blocks[blockIndex] || null;
    });
    return { circleIdx, quarters };
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-between p-4 sm:p-6 font-sans">
      {/* 顶部：日期与标题 */}
      <header className="w-full max-w-md text-center my-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">饼子专注工作时间记录器</h1>
        <div className="mt-1 text-sm text-slate-500 font-medium">
          {dateString} <span className="mx-1">•</span> {dayOfWeek}
        </div>
      </header>

      {/* 中间：核心记录区域 */}
      <main className="w-full max-w-md bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col items-center flex-1 justify-center my-2">
        {/* 圆形列表展示 */}
        <div className="flex flex-wrap justify-center gap-6 mb-8 max-h-[320px] overflow-y-auto p-2 w-full">
          {circles.map(({ circleIdx, quarters }) => (
            <div key={circleIdx} className="flex flex-col items-center gap-1.5">
              <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-slate-300 flex flex-wrap p-1 bg-slate-50/50 shadow-inner">
                {quarters.map((block, qIdx) => {
                  // 每片都用同一块左上 1/4 圆，再按所在格镜面对称折叠后拼进整圆。
                  // 第 3、6、9… 片：上下对折；第 4、8、12… 片：左右+上下对折。
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
                            onClick={() => openNoteModal(block.id, block.note)}
                            title={block.note ? `备注: ${block.note}` : '点击添加备注'}
                            className="w-full h-full bg-amber-400 hover:bg-amber-500 transition-colors rounded-tl-full flex items-center justify-center relative group shadow-sm"
                          >
                            {block.note && (
                              <span className="w-2 h-2 rounded-full bg-amber-800 absolute" />
                            )}
                          </motion.button>
                        ) : (
                          <div
                            onClick={handleAdd15Min}
                            className="w-full h-full cursor-pointer hover:bg-slate-200/50 transition-colors rounded-tl-full"
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

        {/* 交互按钮 */}
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
            whileTap={{ scale: 0.95 }}
            onClick={handleAdd15Min}
            className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200 transition-all"
            aria-label="+"
          >
            <Plus className="w-5 h-5" />
          </motion.button>
        </div>

        <div className="mt-4 text-xs font-semibold text-slate-500">
          今日累计专注:{' '}
          <span className="text-amber-600 text-sm font-bold">
            {Math.floor((filledCount * 15) / 60)} hrs {(filledCount * 15) % 60} mins
          </span>
        </div>
      </main>

      {/* 底部：宠物与体重系统 */}
      <footer className="w-full max-w-md bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center">
        {/* SVG 卡通小怪物 */}
        <div className="relative h-28 flex items-center justify-center">
          <motion.div
            animate={
              isEating
                ? { scale: [1, 1.35, 0.95, 1.1, 1], rotate: [0, -5, 5, -3, 0] }
                : { y: [0, -4, 0] }
            }
            transition={
              isEating
                ? { duration: 0.8, ease: "easeInOut" }
                : { repeat: Infinity, duration: 3, ease: "easeInOut" }
            }
            className="cursor-pointer"
          >
            <svg width="90" height="90" viewBox="0 0 100 100" className="drop-shadow-md">
              {/* 身体 */}
              <circle cx="50" cy="50" r="42" fill="#FCD34D" />
              
              {/* 腮红 */}
              <circle cx="30" cy="55" r="6" fill="#F87171" opacity="0.4" />
              <circle cx="70" cy="55" r="6" fill="#F87171" opacity="0.4" />

              {/* 眼睛 */}
              <circle cx="36" cy="45" r="4" fill="#1E293B" />
              <circle cx="64" cy="45" r="4" fill="#1E293B" />
              <circle cx="37.5" cy="43.5" r="1.5" fill="#FFFFFF" />
              <circle cx="65.5" cy="43.5" r="1.5" fill="#FFFFFF" />

              {/* 嘴巴（吃东西时张开） */}
              {isEating ? (
                <path d="M 40 58 Q 50 72 60 58 Z" fill="#1E293B" />
              ) : (
                <path d="M 42 58 Q 50 64 58 58" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" fill="none" />
              )}

              {/* 顶部的萌角/小芽 */}
              <path d="M 50 8 Q 45 0 40 4" stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" />
              <path d="M 50 8 Q 55 0 60 4" stroke="#10B981" strokeWidth="3" strokeLinecap="round" fill="none" />
            </svg>
          </motion.div>

          {/* 动画时的饼干粒子效果 */}
          {isEating && (
            <motion.div 
              initial={{ opacity: 1, scale: 1, y: 0 }}
              animate={{ opacity: 0, scale: 0.2, y: -20 }}
              transition={{ duration: 0.5 }}
              className="absolute text-xl font-bold text-amber-600"
            >
              🍪 咀嚼中...
            </motion.div>
          )}
        </div>

        {/* 体重计 & 结算喂食 */}
        <div className="w-full mt-2 flex items-center justify-between border-t border-slate-100 pt-3">
          <div className="flex flex-col">
            <span className="text-xs text-slate-400">小怪物当前体重</span>
            <span className="text-lg font-bold text-slate-700">
              {monsterWeight.toFixed(2)} <span className="text-xs font-normal">kg</span>
            </span>
          </div>

          <button
            onClick={handleFeedMonster}
            disabled={blocks.length === 0 || isEating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
              blocks.length === 0 || isEating
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 active:scale-95'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>模拟 23:55 结算喂食</span>
          </button>
        </div>
      </footer>

      {/* 备注 Modal */}
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