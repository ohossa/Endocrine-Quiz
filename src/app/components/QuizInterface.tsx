import { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  X,
  Check,
  AlertCircle,
  Lightbulb,
  Bookmark,
  Flag,
  Target,
  Grid3X3,
  Activity,
  ArrowRight,
  List,
} from 'lucide-react';
import { ChapterData, SubjectData, Question, SubjectColor, subjectStyles, formatTime } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  chapter: ChapterData;
  subject: SubjectData | null;
  questions: Question[];
  onBack: () => void;
  onFinish: (answers: Record<number, number>, elapsedSeconds: number, flaggedQuestions: Set<number>) => void;
}

export function QuizInterface({ chapter, subject, questions, onBack, onFinish }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [seconds, setSeconds] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const current = questions[currentIdx];
  const answered = current !== undefined && answers[currentIdx] !== undefined;
  const selectedIdx = answers[currentIdx];
  const isCorrect = answered && selectedIdx === current.correctIndex;
  const subjectColor: SubjectColor = (current?.subjectColor as SubjectColor) ?? 'physiology';
  const s = subjectStyles[subjectColor];

  const correctCount = Object.entries(answers).filter(
    ([idx, ans]) => questions[Number(idx)]?.correctIndex === ans,
  ).length;
  const answeredCount = Object.keys(answers).length;
  const pct = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  const handleSelect = useCallback(
    (optionIdx: number) => {
      if (answered) return;
      setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));
    },
    [answered, currentIdx],
  );

  const handleFinish = () => onFinish(answers, seconds, flagged);

  const toggleFlag = (idx: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  if (!current) return null;

  const progressPct = ((currentIdx + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50/70 dark:bg-gray-950 font-manrope">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes optionReveal {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8); }
          60% { transform: scale(1.05); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-4px); }
          40% { transform: translateX(4px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(34,197,94,0); }
        }
        @keyframes progressShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .question-animate { animation: fadeInUp 500ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .option-animate { animation: optionReveal 400ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .option-animate:nth-child(1) { animation-delay: 150ms; }
        .option-animate:nth-child(2) { animation-delay: 220ms; }
        .option-animate:nth-child(3) { animation-delay: 290ms; }
        .option-animate:nth-child(4) { animation-delay: 360ms; }
        .feedback-animate { animation: slideDown 450ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .icon-pop { animation: popIn 400ms cubic-bezier(0.34,1.56,0.64,1) both; }
        .correct-glow { animation: pulseGlow 1.5s ease-in-out 1; }
        .wrong-shake { animation: shake 400ms ease-in-out 1; }
        .blob-float { animation: float 8s ease-in-out infinite; }
        .progress-bar-fill {
          transition: width 600ms cubic-bezier(0.34,1.56,0.64,1);
          background: linear-gradient(90deg, #10B981, #06B6D4, #3B82F6);
          background-size: 300% 100%;
          animation: progressShimmer 4s ease-in-out infinite;
        }
        .nav-btn { transition: all 300ms cubic-bezier(0.34,1.56,0.64,1); }
        .nav-btn:hover:not(:disabled) { transform: scale(0.97); }
        .nav-btn:active:not(:disabled) { transform: scale(0.94); }
        .option-btn { transition: all 280ms cubic-bezier(0.34,1.56,0.64,1); }
        .option-btn:hover:not(.answered) { transform: translateX(4px); }
        .option-btn:active:not(.answered) { transform: scale(0.985); }
        .sidebar-card { transition: all 300ms ease; }
      `}</style>

      {/* STICKY HEADER */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="nav-btn inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white border border-gray-100 dark:border-gray-700"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="hidden md:flex items-center gap-2 text-sm">
                <span className="text-gray-400 dark:text-gray-500 font-medium">Chapter {chapter.id}</span>
                <ChevronRight size={12} className="text-gray-300 dark:text-gray-600" />
                <span className="text-gray-400 dark:text-gray-500 font-medium">{chapter.title}</span>
                <ChevronRight size={12} className="text-gray-300 dark:text-gray-600" />
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${s.bgOp10} ${s.textDark} text-xs font-bold`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.bg}`} />
                  {subject ? subject.name : 'All Subjects'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="font-archivo text-xl font-black text-gray-900 dark:text-white">
                {currentIdx + 1}
                <span className="text-sm text-gray-300 dark:text-gray-600 font-medium mx-1">/</span>
                <span className="text-sm text-gray-400 dark:text-gray-500 font-semibold">{questions.length}</span>
              </div>
              <span className="text-xs text-gray-300 dark:text-gray-600 font-medium hidden sm:inline">questions</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <Clock size={14} className="text-gray-400 dark:text-gray-500" />
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300 tabular-nums">{formatTime(seconds)}</span>
              </div>
              <ThemeToggle />
              <button
                onClick={handleFinish}
                className="nav-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-100 dark:hover:border-gray-700"
              >
                <X size={14} />
                <span className="hidden sm:inline">Exit</span>
              </button>
            </div>
          </div>

          <div className="h-1 -mx-6 lg:-mx-10 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="progress-bar-fill h-full rounded-full" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8 lg:py-12">
        <div className="flex gap-8 lg:gap-12">

          {/* LEFT: QUIZ AREA */}
          <div className="flex-1 max-w-3xl">

            {/* QUESTION CARD */}
            <div
              key={currentIdx}
              className="question-animate bg-white dark:bg-gray-900 rounded-[30px] p-8 lg:p-10 border border-gray-100 dark:border-gray-800 relative overflow-hidden"
              style={{ boxShadow: '0 4px 24px -4px rgba(0,0,0,0.06)' }}
            >
              <div className={`blob-float absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-bl ${s.bgOp5} to-transparent pointer-events-none`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full ${s.bgOp8} ${s.textDark} text-[11px] font-bold uppercase tracking-wider`}>
                      <List size={11} />
                      {current.type === 'truefalse' ? 'True / False' : 'Multiple Choice'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleFlag(currentIdx)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                      flagged.has(currentIdx)
                        ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-600 dark:text-amber-400'
                        : 'bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-400 dark:text-gray-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-200 dark:hover:border-amber-700 hover:text-amber-500 dark:hover:text-amber-400'
                    }`}
                  >
                    <Flag size={11} className={flagged.has(currentIdx) ? 'fill-amber-500 text-amber-500' : ''} />
                    {flagged.has(currentIdx) ? 'Flagged' : 'Flag'}
                  </button>
                </div>

                <div className="flex items-start gap-4 mb-2">
                  <span className="flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-archivo font-black text-sm mt-0.5">
                    {currentIdx + 1}
                  </span>
                  <h2 className="font-archivo text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-relaxed">
                    {current.text}
                  </h2>
                </div>
              </div>
            </div>

            {/* OPTIONS */}
            <div key={`opts-${currentIdx}`} className="mt-5 space-y-3">
              {current.options.map((option, idx) => {
                const isSelected = answered && selectedIdx === idx;
                const isCorrectOpt = idx === current.correctIndex;
                const showResult = answered;

                let className = 'option-animate option-btn bg-white dark:bg-gray-900 rounded-3xl px-6 py-5 border-2 cursor-pointer group relative overflow-hidden ';

                if (!showResult) {
                  className += 'border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700';
                } else if (isCorrectOpt) {
                  className += `border-success/30 correct-glow`;
                } else if (isSelected && !isCorrectOpt) {
                  className += `border-danger/30 wrong-shake`;
                } else {
                  className += 'border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed';
                }

                return (
                  <div
                    key={idx}
                    className={className}
                    style={
                      showResult && isCorrectOpt
                        ? { boxShadow: '0 2px 16px -2px rgba(34,197,94,0.12)' }
                        : showResult && isSelected && !isCorrectOpt
                        ? { boxShadow: '0 2px 16px -2px rgba(239,68,68,0.08)' }
                        : {}
                    }
                    onClick={() => !showResult && handleSelect(idx)}
                  >
                    {showResult && isCorrectOpt && (
                      <div className="absolute inset-0 bg-success/[0.03]" />
                    )}
                    {showResult && isSelected && !isCorrectOpt && (
                      <div className="absolute inset-0 bg-danger/[0.02]" />
                    )}

                    <div className="relative flex items-center gap-4">
                      {showResult && isCorrectOpt ? (
                        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-success/10 border-2 border-success/30 flex items-center justify-center">
                          <Check size={20} className="icon-pop text-success" />
                        </div>
                      ) : showResult && isSelected && !isCorrectOpt ? (
                        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-danger/10 border-2 border-danger/25 flex items-center justify-center">
                          <X size={20} className="icon-pop text-danger" />
                        </div>
                      ) : (
                        <div className="flex-shrink-0 w-11 h-11 rounded-2xl bg-gray-50 dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 flex items-center justify-center font-archivo font-bold text-sm text-gray-400 dark:text-gray-500">
                          {String.fromCharCode(65 + idx)}
                        </div>
                      )}

                      <div
                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          showResult && isCorrectOpt
                            ? 'border-success bg-success'
                            : showResult && isSelected && !isCorrectOpt
                            ? 'border-danger bg-danger'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {(showResult && (isCorrectOpt || isSelected)) && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      <span
                        className={`text-base font-semibold leading-snug flex-1 ${
                          showResult && isCorrectOpt
                            ? 'text-success-dark'
                            : showResult && isSelected && !isCorrectOpt
                            ? 'text-danger-dark line-through decoration-danger/30 decoration-2'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {option}
                      </span>

                      {showResult && isCorrectOpt && (
                        <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                          <Check size={10} />
                          Correct
                        </span>
                      )}
                      {showResult && isSelected && !isCorrectOpt && (
                        <span className="ml-auto inline-flex items-center gap-1 px-3 py-1 rounded-full bg-danger/10 text-danger text-[10px] font-bold uppercase tracking-wider flex-shrink-0">
                          <X size={10} />
                          Your Pick
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FEEDBACK */}
            {answered && (
              <div key={`fb-${currentIdx}`} className="feedback-animate mt-6 space-y-4">
                {isCorrect ? (
                  <div className="rounded-3xl bg-success/[0.04] border border-success/15 px-7 py-5 flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center mt-0.5">
                      <Check size={20} className="text-success" />
                    </div>
                    <div>
                      <h4 className="font-archivo text-sm font-bold text-success-dark mb-1">Correct Answer!</h4>
                      <p className="text-sm text-success-dark/70 leading-relaxed">
                        Well done — you selected the right answer.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-3xl bg-danger/[0.04] border border-danger/15 px-7 py-5 flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-danger/10 flex items-center justify-center mt-0.5">
                      <AlertCircle size={20} className="text-danger" />
                    </div>
                    <div>
                      <h4 className="font-archivo text-sm font-bold text-danger-dark mb-1">Incorrect Answer</h4>
                      <p className="text-sm text-danger-dark/70 leading-relaxed">
                        You selected <strong>{current.options[selectedIdx]}</strong> — the correct answer is{' '}
                        <strong>{current.options[current.correctIndex]}</strong>.
                      </p>
                    </div>
                  </div>
                )}

                <div className="rounded-3xl bg-success/[0.04] border border-success/15 px-7 py-5 flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center mt-0.5">
                    <Lightbulb size={20} className="text-success" />
                  </div>
                  <div>
                    <h4 className="font-archivo text-sm font-bold text-success-dark mb-1">
                      Correct Answer: {current.options[current.correctIndex]}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{current.explanation}</p>
                  </div>
                </div>

                {current.keyConcept && (
                  <div className="rounded-3xl bg-biochem/[0.04] border border-biochem/15 px-7 py-5 flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-biochem/10 flex items-center justify-center mt-0.5">
                      <Bookmark size={20} className="text-biochem" />
                    </div>
                    <div>
                      <h4 className="font-archivo text-sm font-bold text-biochem-dark mb-1">Key Concept</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{current.keyConcept}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* NAVIGATION */}
            <div className="mt-8 flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                disabled={currentIdx === 0}
                className="nav-btn inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
              >
                <ArrowLeft size={16} />
                Previous
              </button>

              {/* Question dots (desktop) — sliding window */}
              {(() => {
                const WINDOW = 13;
                const total = questions.length;
                const half = Math.floor(WINDOW / 2);
                let start = Math.max(0, currentIdx - half);
                let end = Math.min(total - 1, start + WINDOW - 1);
                if (end - start < WINDOW - 1) start = Math.max(0, end - WINDOW + 1);
                const showLeftEllipsis = start > 0;
                const showRightEllipsis = end < total - 1;
                const visibleIdxs = Array.from({ length: end - start + 1 }, (_, k) => start + k);
                return (
                  <div className="hidden lg:flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                    {showLeftEllipsis && <span className="text-gray-300 dark:text-gray-600 text-xs font-bold px-0.5">…</span>}
                    {visibleIdxs.map((idx) => {
                      const ans = answers[idx];
                      const isCurrent = idx === currentIdx;
                      const isAns = ans !== undefined;
                      const wasCorrect = isAns && questions[idx].correctIndex === ans;
                      const isFlagged = flagged.has(idx);
                      return (
                        <button
                          key={idx}
                          onClick={() => setCurrentIdx(idx)}
                          className={`rounded-full transition-all duration-250 ${
                            isCurrent
                              ? 'w-3.5 h-3.5 bg-gray-900 dark:bg-white ring-4 ring-gray-900/10 dark:ring-white/10'
                              : isFlagged
                              ? 'w-2.5 h-2.5 bg-amber-400'
                              : isAns
                              ? `w-2.5 h-2.5 ${wasCorrect ? 'bg-success' : 'bg-danger'}`
                              : 'w-2.5 h-2.5 bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      );
                    })}
                    {showRightEllipsis && <span className="text-gray-300 dark:text-gray-600 text-xs font-bold px-0.5">…</span>}
                  </div>
                );
              })()}

              {currentIdx < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="nav-btn inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-bold"
                  style={{ boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
                >
                  Next Question
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  onClick={handleFinish}
                  className="nav-btn inline-flex items-center gap-2.5 px-7 py-3.5 rounded-full bg-physiology hover:bg-physiology-dark text-white text-sm font-bold"
                  style={{ boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }}
                >
                  Finish Quiz
                  <Check size={16} />
                </button>
              )}
            </div>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="hidden xl:block w-72 flex-shrink-0">
            <div className="sticky top-24 space-y-5">

              {/* Score tracker */}
              <div className="sidebar-card bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Target size={16} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Live Score</span>
                </div>

                <div className="flex items-center gap-4 mb-5">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                      <circle cx="32" cy="32" r="28" fill="none" stroke="#F3F4F6" strokeWidth="4" className="dark:stroke-gray-800" />
                      <circle
                        cx="32" cy="32" r="28" fill="none"
                        stroke="#22C55E" strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: 'stroke-dashoffset 600ms ease' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="font-archivo text-lg font-black text-gray-900 dark:text-white">{pct}%</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-2xl font-archivo font-black text-gray-900 dark:text-white">
                      {correctCount}<span className="text-gray-300 dark:text-gray-600">/</span>{answeredCount}
                    </div>
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Correct</div>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: 'Correct', value: correctCount, color: 'bg-success', textColor: 'text-success' },
                    { label: 'Incorrect', value: answeredCount - correctCount, color: 'bg-danger', textColor: 'text-danger' },
                    { label: 'Remaining', value: questions.length - answeredCount, color: 'bg-gray-300 dark:bg-gray-600', textColor: 'text-gray-400 dark:text-gray-500' },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${row.color}`} />
                        <span className="font-semibold text-gray-600 dark:text-gray-400">{row.label}</span>
                      </div>
                      <span className={`font-bold ${row.textColor}`}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Question Map */}
              <div className="sidebar-card bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Grid3X3 size={16} className="text-gray-400 dark:text-gray-500" />
                  <span className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Question Map</span>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {questions.map((q, idx) => {
                    const ans = answers[idx];
                    const isCurrent = idx === currentIdx;
                    const isAns = ans !== undefined;
                    const wasCorrect = isAns && q.correctIndex === ans;
                    const isFlagged = flagged.has(idx);

                    let cls = 'w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold cursor-pointer transition-all border-2 ';
                    if (isCurrent) cls += 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900 ring-4 ring-gray-900/10 dark:ring-white/10';
                    else if (isFlagged) cls += 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400';
                    else if (wasCorrect) cls += 'bg-success/10 border-success/30 text-success';
                    else if (isAns) cls += 'bg-danger/10 border-danger/30 text-danger';
                    else cls += 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-300 dark:text-gray-600';

                    return (
                      <button key={idx} className={cls} onClick={() => setCurrentIdx(idx)}>
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-x-4 gap-y-1.5">
                  {[
                    { color: 'bg-success', label: 'Correct' },
                    { color: 'bg-danger', label: 'Wrong' },
                    { color: 'bg-amber-400', label: 'Flagged' },
                    { color: 'bg-gray-900 dark:bg-white', label: 'Current' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                      <span className={`w-2 h-2 rounded ${item.color}`} />
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Subject info */}
              <div className={`sidebar-card bg-gradient-to-br ${s.bgOp5} to-clinical/5 rounded-3xl p-5 ${s.borderOp10} border`}>
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl ${s.bgOp15} flex items-center justify-center`}>
                    <Activity size={18} className={s.text} />
                  </div>
                  <div>
                    <div className={`text-xs font-bold ${s.textDark} uppercase tracking-wider`}>
                      {subject ? subject.name : 'All Subjects'}
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                  Chapter {chapter.id}: {chapter.title}. {chapter.subtitle}.
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-8">
        <p className="text-center text-[11px] text-gray-300 dark:text-gray-600 font-medium">
          Endocrine Module Quiz • Chapter {chapter.id}: {chapter.title} • {subject ? subject.name : 'All Subjects'}
        </p>
      </div>
    </div>
  );
}
