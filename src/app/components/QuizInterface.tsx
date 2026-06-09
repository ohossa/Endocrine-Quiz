import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Keyboard,
} from 'lucide-react';
import { ChapterData, SubjectData, Question, SubjectColor, subjectStyles, formatTime } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { shuffleArray } from '../data';

const renderFormattedText = (
  text: string | undefined,
  fallbackClassName: string = "text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap text-left"
) => {
  if (!text) return null;
  if (text.includes('|')) {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const rows = lines
      .filter((line) => !line.includes('---') && line.includes('|'))
      .map((line) => {
        const parts = line.split('|');
        if (parts[0] === '') parts.shift();
        if (parts[parts.length - 1] === '') parts.pop();
        return parts.map((cell) => cell.trim());
      });

    if (rows.length > 0) {
      const headers = rows[0];
      const bodyRows = rows.slice(1);

      return (
        <div className="overflow-x-auto my-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 text-left">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
                {headers.map((h, idx) => (
                  <th key={idx} className="p-4 text-[10px] sm:text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-gray-50/50 dark:hover:bg-gray-950/30 transition-colors">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-4 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
  return (
    <div className={fallbackClassName}>
      {text}
    </div>
  );
};


interface Props {
  chapter: ChapterData;
  subject: SubjectData | null;
  questions: Question[];
  onBack: () => void;
  onFinish: (answers: Record<number, number>, elapsedSeconds: number, flaggedQuestions: Set<number>) => void;
}

export function QuizInterface({ chapter, subject, questions, onBack, onFinish }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const secondsRef = useRef(0);

  // New matching/essay state variables
  const [draftMatching, setDraftMatching] = useState<Record<number, number>>({});
  const [selectedPremise, setSelectedPremise] = useState<number | null>(null);
  const [essayDraft, setEssayDraft] = useState('');
  const [showEssayAnswer, setShowEssayAnswer] = useState(false);

  // Case study sub-essay states
  const [subEssayDrafts, setSubEssayDrafts] = useState<Record<string, string>>({});
  const [revealedSubEssays, setRevealedSubEssays] = useState<Record<string, boolean>>({});
  const [showKeyboardHelper, setShowKeyboardHelper] = useState(false);

  // Reference for scrambled matching target orders
  const scrambledTargetsRef = useRef<Record<number, string[]>>({});

  useEffect(() => {
    const scrambled: Record<number, string[]> = {};
    questions.forEach((q, idx) => {
      if (q.type === 'matching' && q.pairs) {
        scrambled[idx] = shuffleArray(q.pairs.map((p) => p.target));
      }
    });
    scrambledTargetsRef.current = scrambled;
  }, [questions]);

  useEffect(() => {
    setDraftMatching(answers[currentIdx] || {});
    setEssayDraft(answers[currentIdx]?.text || '');
    setShowEssayAnswer(false);
    setSelectedPremise(null);

    // Load case study sub-question essay drafts and clear revealed toggles
    const caseDrafts: Record<string, string> = {};
    const currentQ = questions[currentIdx];
    if (currentQ?.type === 'case' && currentQ.subQuestions) {
      currentQ.subQuestions.forEach((subQ) => {
        if (subQ.type === 'essay') {
          caseDrafts[subQ.id] = answers[currentIdx]?.[subQ.id]?.text || '';
        }
      });
    }
    setSubEssayDrafts(caseDrafts);
    setRevealedSubEssays({});
  }, [currentIdx, answers, questions]);



  const handleTick = useCallback((seconds: number) => {
    secondsRef.current = seconds;
  }, []);

  const checkAnswerCorrect = useCallback((q: Question, ans: any, qIdx: number) => {
    if (ans === undefined) return false;
    if (q.type === 'mcq' || q.type === 'truefalse') {
      return ans === q.correctIndex;
    }
    if (q.type === 'matching') {
      const scrambled = ans.scrambled || scrambledTargetsRef.current[qIdx];
      const matches = ans.matches || ans;
      if (!scrambled || !matches || !q.pairs) return false;
      return q.pairs.every((pair, pIdx) => {
        const correctTargetIdx = scrambled.indexOf(pair.target);
        return matches[pIdx] === correctTargetIdx;
      });
    }
    if (q.type === 'essay') {
      return ans?.selfGrade === 'correct';
    }
    if (q.type === 'case' && q.subQuestions) {
      return q.subQuestions.every((subQ) => {
        const subAns = ans[subQ.id];
        if (subAns === undefined) return false;
        if (subQ.type === 'mcq') {
          return subAns === subQ.correctIndex;
        }
        if (subQ.type === 'essay') {
          return subAns?.selfGrade === 'correct';
        }
        return false;
      });
    }
    return false;
  }, []);

  const isQuestionCompleted = useCallback((q: Question, ans: any) => {
    if (ans === undefined) return false;
    if (q.type === 'case' && q.subQuestions) {
      return q.subQuestions.every((subQ) => ans[subQ.id] !== undefined);
    }
    return true;
  }, []);

  const current = questions[currentIdx];
  const answered = current !== undefined && isQuestionCompleted(current, answers[currentIdx]);
  const selectedIdx = answers[currentIdx];
  const isCorrect = answered && checkAnswerCorrect(current, answers[currentIdx], currentIdx);
  const subjectColor: SubjectColor = (current?.subjectColor as SubjectColor) ?? 'physiology';
  const s = subjectStyles[subjectColor];

  const getScoreStats = useCallback(() => {
    let totalPoints = 0;
    let answeredPoints = 0;
    let correctPoints = 0;

    questions.forEach((q, idx) => {
      const ans = answers[idx];
      if (q.type === 'case' && q.subQuestions) {
        totalPoints += q.subQuestions.length;
        if (ans) {
          q.subQuestions.forEach((subQ) => {
            const subAns = ans[subQ.id];
            if (subAns !== undefined) {
              answeredPoints++;
              const isSubCorrect = subQ.type === 'mcq'
                ? subAns === subQ.correctIndex
                : subAns?.selfGrade === 'correct';
              if (isSubCorrect) correctPoints++;
            }
          });
        }
      } else {
        totalPoints += 1;
        if (ans !== undefined) {
          answeredPoints++;
          if (checkAnswerCorrect(q, ans, idx)) {
            correctPoints++;
          }
        }
      }
    });

    return { totalPoints, answeredPoints, correctPoints };
  }, [questions, answers, checkAnswerCorrect]);

  const { totalPoints, answeredPoints, correctPoints } = getScoreStats();
  const correctCount = correctPoints;
  const answeredCount = answeredPoints;
  const pct = answeredPoints > 0 ? Math.round((correctPoints / answeredPoints) * 100) : 0;
  const circumference = 2 * Math.PI * 28;
  const offset = circumference - (pct / 100) * circumference;

  const handleSelect = useCallback(
    (optionIdx: number) => {
      if (answered) return;
      setAnswers((prev) => ({ ...prev, [currentIdx]: optionIdx }));
    },
    [answered, currentIdx],
  );

  const handleFinish = () => onFinish(answers, secondsRef.current, flagged);

  const toggleFlag = (idx: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      // If helper modal is open, Escape should close it
      if (showKeyboardHelper && key === 'escape') {
        setShowKeyboardHelper(false);
        return;
      }

      // If student is typing in an essay textarea, don't trigger quiz navigation shortcuts!
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
        return;
      }

      if (key === 'f') {
        toggleFlag(currentIdx);
      } else if (key === 'arrowleft') {
        setCurrentIdx((i) => Math.max(0, i - 1));
      } else if (key === 'arrowright') {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((i) => i + 1);
        }
      } else if (key === 'a' || key === 'b' || key === 'c' || key === 'd') {
        const idx = key.charCodeAt(0) - 97;
        const currentQ = questions[currentIdx];
        if (currentQ) {
          if (currentQ.type === 'mcq' && currentQ.options && idx < currentQ.options.length) {
            handleSelect(idx);
          } else if (currentQ.type === 'truefalse' && idx < 2) {
            handleSelect(idx);
          }
        }
      } else if (key === 'enter') {
        if (currentIdx < questions.length - 1) {
          setCurrentIdx((i) => i + 1);
        } else {
          handleFinish();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIdx, questions, handleSelect, handleFinish, showKeyboardHelper]);

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
              <QuizTimer onTick={handleTick} />
              <ThemeToggle />
              <button
                onClick={() => setShowKeyboardHelper(true)}
                className="hidden lg:inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 nav-btn"
                title="Keyboard Shortcuts"
              >
                <Keyboard size={18} />
              </button>
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
        <div className="flex flex-col xl:flex-row gap-8 lg:gap-12">

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
                      {current.type === 'truefalse'
                        ? 'True / False'
                        : current.type === 'matching'
                        ? 'Matching'
                        : current.type === 'essay'
                        ? 'Essay'
                        : current.type === 'case'
                        ? 'Clinical Case Study'
                        : 'Multiple Choice'}
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
                  <div className="font-archivo text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-relaxed">
                    {renderFormattedText(current.text, "font-archivo text-xl lg:text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-relaxed")}
                  </div>
                </div>
              </div>
            </div>

            {/* OPTIONS */}
            <div key={`opts-${currentIdx}`} className="mt-5">
              {current.type === 'mcq' && current.options && (
                <div className="space-y-3">
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
              )}

              {current.type === 'truefalse' && current.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: 'True', idx: 0, color: 'success', text: 'True Statement' },
                    { label: 'False', idx: 1, color: 'danger', text: 'False Statement' }
                  ].map((item) => {
                    const isSelected = answered && selectedIdx === item.idx;
                    const isCorrectOpt = item.idx === current.correctIndex;
                    const showResult = answered;

                    let cardClass = 'option-btn rounded-[24px] p-6 border-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all ';

                    if (!showResult) {
                      cardClass += 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-300';
                    } else if (isCorrectOpt) {
                      cardClass += 'border-success bg-success/[0.03] correct-glow';
                    } else if (isSelected && !isCorrectOpt) {
                      cardClass += 'border-danger bg-danger/[0.02] wrong-shake';
                    } else {
                      cardClass += 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed';
                    }

                    return (
                      <div
                        key={item.idx}
                        className={cardClass}
                        onClick={() => !showResult && handleSelect(item.idx)}
                      >
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 ${
                          showResult && isCorrectOpt
                            ? 'bg-success/10 text-success'
                            : showResult && isSelected && !isCorrectOpt
                            ? 'bg-danger/10 text-danger'
                            : item.idx === 0
                            ? 'bg-success/5 text-success'
                            : 'bg-danger/5 text-danger'
                        }`}>
                          {showResult && isCorrectOpt ? (
                            <Check size={28} className="icon-pop" />
                          ) : showResult && isSelected && !isCorrectOpt ? (
                            <X size={28} className="icon-pop" />
                          ) : item.idx === 0 ? (
                            <Check size={28} />
                          ) : (
                            <X size={28} />
                          )}
                        </div>
                        <span className="font-archivo text-xl font-bold text-gray-900 dark:text-white mb-1">{item.label}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">{item.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {current.type === 'matching' && (() => {
                const scrambled = scrambledTargetsRef.current[currentIdx] || [];
                const isAnswered = answered;
                const studentAnswers = answered ? answers[currentIdx] : draftMatching;

                const getTargetForPremise = (pIdx: number) => {
                  const tIdx = studentAnswers[pIdx];
                  return tIdx !== undefined ? scrambled[tIdx] : null;
                };

                const isTargetMatched = (tIdx: number) => {
                  return Object.values(studentAnswers).includes(tIdx);
                };

                const handlePremiseClick = (pIdx: number) => {
                  if (isAnswered) return;
                  setSelectedPremise(pIdx);
                };

                const handleTargetClick = (tIdx: number) => {
                  if (isAnswered || selectedPremise === null) return;
                  setDraftMatching((prev) => ({
                    ...prev,
                    [selectedPremise]: tIdx,
                  }));
                  setSelectedPremise(null);
                };

                const handleUnpair = (e: React.MouseEvent, pIdx: number) => {
                  e.stopPropagation();
                  if (isAnswered) return;
                  setDraftMatching((prev) => {
                    const next = { ...prev };
                    delete next[pIdx];
                    return next;
                  });
                  setSelectedPremise(null);
                };

                const allMatched = current.pairs && Object.keys(draftMatching).length === current.pairs.length;

                const handleSubmitMatch = () => {
                  if (isAnswered) return;
                  setAnswers((prev) => ({
                    ...prev,
                    [currentIdx]: { matches: draftMatching, scrambled },
                  }));
                };

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h4 className="font-archivo text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Premises</h4>
                        {current.pairs?.map((pair, pIdx) => {
                          const pairedTarget = getTargetForPremise(pIdx);
                          const isSelected = selectedPremise === pIdx;
                          const isPairCorrect = isAnswered && studentAnswers[pIdx] === scrambled.indexOf(pair.target);

                          let itemClass = 'option-btn border-2 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all ';
                          if (isAnswered) {
                            itemClass += isPairCorrect
                              ? 'border-success/30 bg-success/[0.02]'
                              : 'border-danger/25 bg-danger/[0.02]';
                          } else if (isSelected) {
                            itemClass += `${s.border} ${s.bgOp5} ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 ring-physiology`;
                          } else {
                            itemClass += 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300';
                          }

                          return (
                            <div key={pIdx} className={itemClass} onClick={() => handlePremiseClick(pIdx)}>
                              <div className="flex-1 min-w-0 pr-3">
                                <span className="text-sm font-bold text-gray-900 dark:text-white block truncate">{pair.premise}</span>
                                {pairedTarget ? (
                                  <span className={`text-xs font-semibold mt-1 block truncate ${
                                    isAnswered ? (isPairCorrect ? 'text-success-dark' : 'text-danger-dark') : s.textDark
                                  }`}>
                                    Matched to: <strong className="underline">{pairedTarget}</strong>
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500 italic block mt-1">
                                    {isSelected ? 'Select target on the right...' : 'Click to select & pair...'}
                                  </span>
                                )}
                              </div>
                              {pairedTarget && !isAnswered && (
                                <button
                                  onClick={(e) => handleUnpair(e, pIdx)}
                                  className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-danger transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              )}
                              {isAnswered && (
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isPairCorrect ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                                }`}>
                                  {isPairCorrect ? <Check size={14} /> : <X size={14} />}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <div className="space-y-3">
                        <h4 className="font-archivo text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">Targets</h4>
                        {scrambled.map((target, tIdx) => {
                          const matched = isTargetMatched(tIdx);
                          let targetClass = 'option-btn border-2 rounded-2xl p-4 flex items-center justify-between transition-all ';

                          if (isAnswered) {
                            targetClass += 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 opacity-60';
                          } else if (matched) {
                            targetClass += 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 opacity-40 cursor-not-allowed';
                          } else {
                            targetClass += 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 cursor-pointer hover:border-gray-300';
                          }

                          return (
                            <div
                              key={tIdx}
                              className={targetClass}
                              onClick={() => !matched && handleTargetClick(tIdx)}
                            >
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 truncate">{target}</span>
                              {matched && !isAnswered && (
                                <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                                  Paired
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {!isAnswered && (
                      <div className="flex justify-end mt-4">
                        <button
                          onClick={handleSubmitMatch}
                          disabled={!allMatched}
                          className={`px-6 py-3 rounded-full text-xs font-bold tracking-wide transition-all ${
                            allMatched
                              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[0.98]'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          }`}
                        >
                          Submit Matches
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {current.type === 'essay' && (
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      rows={5}
                      disabled={answered}
                      value={essayDraft}
                      onChange={(e) => setEssayDraft(e.target.value)}
                      placeholder="Type your answer here (optional). If solving in your head, just click 'Reveal Model Answer' below to grade yourself..."
                      className="w-full rounded-[24px] border-2 border-gray-100 dark:border-gray-800 p-5 text-sm font-semibold bg-white dark:bg-gray-900 focus:border-physiology focus:outline-none disabled:bg-gray-50 dark:disabled:bg-gray-950 disabled:opacity-85 text-gray-700 dark:text-gray-300"
                    />
                  </div>

                  {!answered && !showEssayAnswer && (
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setShowEssayAnswer(true)}
                        className="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-xs font-bold tracking-wide hover:scale-[0.98] transition-transform"
                      >
                        Reveal Model Answer
                      </button>
                    </div>
                  )}

                  {(showEssayAnswer || answered) && (
                    <div className="feedback-animate bg-success/[0.03] border border-success/15 rounded-3xl p-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Lightbulb size={16} className="text-success" />
                        <span className="text-xs font-bold text-success uppercase tracking-wider">Model Answer Reference</span>
                      </div>
                      {renderFormattedText(current.modelAnswer, "text-sm font-medium text-gray-700 dark:text-gray-300 leading-relaxed mb-4 whitespace-pre-wrap text-left")}

                      {!answered && (
                         <div className="pt-4 border-t border-success/10">
                           <h4 className="font-archivo text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                             Self-grading
                           </h4>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => {
                                setAnswers((prev) => ({
                                  ...prev,
                                  [currentIdx]: { text: essayDraft, selfGrade: 'correct' },
                                }));
                                setShowEssayAnswer(false);
                              }}
                              className="px-5 py-2.5 bg-success text-white hover:bg-success-dark rounded-full text-xs font-bold tracking-wide transition-all"
                            >
                              I got it right
                            </button>
                            <button
                              onClick={() => {
                                setAnswers((prev) => ({
                                  ...prev,
                                  [currentIdx]: { text: essayDraft, selfGrade: 'incorrect' },
                                }));
                                setShowEssayAnswer(false);
                              }}
                              className="px-5 py-2.5 bg-white dark:bg-gray-900 border border-danger/25 text-danger-dark hover:bg-danger/5 rounded-full text-xs font-bold tracking-wide transition-all"
                            >
                              I need more review
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {current.type === 'case' && current.subQuestions && (
                <div className="space-y-6">
                  {current.subQuestions.map((subQ, sIdx) => {
                    const subAnswer = answers[currentIdx]?.[subQ.id];
                    const isSubQAnswered = subAnswer !== undefined;

                    return (
                      <div
                        key={subQ.id}
                        className="p-6 rounded-2xl bg-white/75 dark:bg-gray-900/75 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4"
                      >
                        {/* Sub-question Header */}
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${s.bgOp10} ${s.textDark} text-[10px] font-bold uppercase tracking-wider`}>
                            Part {String.fromCharCode(65 + sIdx)}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
                            {subQ.type === 'mcq' ? 'Multiple Choice' : 'Essay'}
                          </span>
                        </div>

                        {/* Sub-question Text */}
                        <div className="text-base font-bold text-gray-900 dark:text-white leading-relaxed">
                           {renderFormattedText(subQ.text, "text-base font-bold text-gray-900 dark:text-white leading-relaxed")}
                        </div>

                        {/* MCQ sub-type */}
                        {subQ.type === 'mcq' && subQ.options && (
                          <div className="space-y-2.5">
                            {subQ.options.map((option, optIdx) => {
                              const isSelected = subAnswer === optIdx;
                              const isCorrectOpt = optIdx === subQ.correctIndex;

                              let optClass = 'w-full text-left rounded-2xl px-5 py-4 border-2 transition-all flex items-center gap-4 cursor-pointer relative overflow-hidden ';
                              if (!isSubQAnswered) {
                                optClass += 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700';
                              } else if (isCorrectOpt) {
                                optClass += 'border-success bg-success/[0.03] correct-glow';
                              } else if (isSelected && !isCorrectOpt) {
                                optClass += 'border-danger bg-danger/[0.02] wrong-shake';
                              } else {
                                optClass += 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 opacity-50 cursor-not-allowed';
                              }

                              return (
                                <div
                                  key={optIdx}
                                  className={optClass}
                                  onClick={() => {
                                    if (isSubQAnswered) return;
                                    setAnswers((prev) => {
                                      const cur = prev[currentIdx] || {};
                                      return {
                                        ...prev,
                                        [currentIdx]: { ...cur, [subQ.id]: optIdx }
                                      };
                                    });
                                  }}
                                >
                                  {isSubQAnswered && isCorrectOpt ? (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-success/10 border border-success/30 flex items-center justify-center">
                                      <Check size={16} className="text-success" />
                                    </div>
                                  ) : isSubQAnswered && isSelected && !isCorrectOpt ? (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-danger/10 border border-danger/25 flex items-center justify-center">
                                      <X size={16} className="text-danger" />
                                    </div>
                                  ) : (
                                    <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center justify-center font-archivo font-bold text-xs text-gray-400 dark:text-gray-500">
                                      {String.fromCharCode(65 + optIdx)}
                                    </div>
                                  )}

                                  <span className={`text-sm font-semibold leading-snug flex-1 ${
                                    isSubQAnswered && isCorrectOpt
                                      ? 'text-success-dark'
                                      : isSubQAnswered && isSelected && !isCorrectOpt
                                      ? 'text-danger-dark line-through decoration-danger/30'
                                      : 'text-gray-700 dark:text-gray-300'
                                  }`}>
                                    {option}
                                  </span>

                                  {isSubQAnswered && isCorrectOpt && (
                                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-success">Correct</span>
                                  )}
                                  {isSubQAnswered && isSelected && !isCorrectOpt && (
                                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider text-danger">Your Pick</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Essay sub-type */}
                        {subQ.type === 'essay' && (
                          <div className="space-y-3">
                            <textarea
                              rows={3}
                              disabled={isSubQAnswered}
                              value={subEssayDrafts[subQ.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSubEssayDrafts((prev) => ({ ...prev, [subQ.id]: val }));
                              }}
                              placeholder="Type notes (optional). If solving in your head, just click 'Reveal Model Answer' below to grade yourself..."
                              className="w-full rounded-2xl border-2 border-gray-100 dark:border-gray-800 p-4 text-xs font-semibold bg-white dark:bg-gray-900 focus:border-physiology focus:outline-none disabled:bg-gray-50 dark:disabled:bg-gray-950 disabled:opacity-85 text-gray-700 dark:text-gray-300"
                            />

                            {!isSubQAnswered && !revealedSubEssays[subQ.id] && (
                              <div className="flex justify-end">
                                <button
                                  onClick={() => setRevealedSubEssays((prev) => ({ ...prev, [subQ.id]: true }))}
                                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full text-[10px] font-bold tracking-wide hover:scale-[0.98] transition-transform"
                                >
                                  Reveal Model Answer
                                </button>
                              </div>
                            )}

                            {(revealedSubEssays[subQ.id] || isSubQAnswered) && (
                              <div className="feedback-animate bg-success/[0.03] border border-success/15 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-1.5 text-success">
                                  <Lightbulb size={14} />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Model Answer Reference</span>
                                </div>
                                {renderFormattedText(subQ.modelAnswer, "text-xs font-medium text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-left")}

                                {!isSubQAnswered && (
                                  <div className="pt-3 border-t border-success/10">
                                    <h5 className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                      Self-grading
                                    </h5>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setAnswers((prev) => {
                                            const cur = prev[currentIdx] || {};
                                            return {
                                              ...prev,
                                              [currentIdx]: {
                                                ...cur,
                                                [subQ.id]: { text: subEssayDrafts[subQ.id] || '', selfGrade: 'correct' }
                                              }
                                            };
                                          });
                                        }}
                                        className="px-3 py-1.5 bg-success text-white hover:bg-success-dark rounded-full text-[9px] font-bold tracking-wide transition-all"
                                      >
                                        Correct
                                      </button>
                                      <button
                                        onClick={() => {
                                          setAnswers((prev) => {
                                            const cur = prev[currentIdx] || {};
                                            return {
                                              ...prev,
                                              [currentIdx]: {
                                                ...cur,
                                                [subQ.id]: { text: subEssayDrafts[subQ.id] || '', selfGrade: 'incorrect' }
                                              }
                                            };
                                          });
                                        }}
                                        className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-danger/25 text-danger-dark hover:bg-danger/5 rounded-full text-[9px] font-bold tracking-wide transition-all"
                                      >
                                        Needs Review
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Sub-question Feedback / Explanations */}
                        {isSubQAnswered && (
                          <div className="feedback-animate space-y-2">
                            {/* Explanations */}
                            {subQ.explanation && (
                              <div className="p-4 rounded-xl bg-success/[0.03] border border-success/15 flex items-start gap-2.5">
                                <Lightbulb size={15} className="text-success mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-[10px] font-bold text-success-dark uppercase tracking-wider mb-0.5">Explanation</h5>
                                  {renderFormattedText(subQ.explanation, "text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap text-left")}
                                </div>
                              </div>
                            )}

                            {/* Key Concepts */}
                            {subQ.keyConcept && (
                              <div className="p-4 rounded-xl bg-biochem/[0.03] border border-biochem/15 flex items-start gap-2.5">
                                <Bookmark size={15} className="text-biochem mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <h5 className="text-[10px] font-bold text-biochem-dark uppercase tracking-wider mb-0.5">Key Concept</h5>
                                  {renderFormattedText(subQ.keyConcept, "text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap text-left")}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FEEDBACK */}
            {answered && (
              <div key={`fb-${currentIdx}`} className="feedback-animate mt-6 space-y-4">
                {(current.type === 'mcq' || current.type === 'truefalse') && (
                  isCorrect ? (
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
                          You selected <strong>{current.options?.[selectedIdx]}</strong> — the correct answer is{' '}
                          <strong>{current.options?.[current.correctIndex ?? 0]}</strong>.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {current.type === 'matching' && (
                  isCorrect ? (
                    <div className="rounded-3xl bg-success/[0.04] border border-success/15 px-7 py-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center mt-0.5">
                        <Check size={20} className="text-success" />
                      </div>
                      <div>
                        <h4 className="font-archivo text-sm font-bold text-success-dark mb-1">All Pairs Matched!</h4>
                        <p className="text-sm text-success-dark/70 leading-relaxed">
                          Great job — all premises have been matched to their correct targets.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-danger/[0.04] border border-danger/15 px-7 py-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-danger/10 flex items-center justify-center mt-0.5">
                        <AlertCircle size={20} className="text-danger" />
                      </div>
                      <div>
                        <h4 className="font-archivo text-sm font-bold text-danger-dark mb-1">Some Pairs Incorrect</h4>
                        <p className="text-sm text-danger-dark/70 leading-relaxed">
                          One or more matches are incorrect. Review the correct pairings highlighted above.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {current.type === 'essay' && (
                  isCorrect ? (
                    <div className="rounded-3xl bg-success/[0.04] border border-success/15 px-7 py-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center mt-0.5">
                        <Check size={20} className="text-success" />
                      </div>
                      <div>
                        <h4 className="font-archivo text-sm font-bold text-success-dark mb-1">Self-Assessment: Correct</h4>
                        <p className="text-sm text-success-dark/70 leading-relaxed">
                          You marked your draft answer as matching the key concepts.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-danger/[0.04] border border-danger/15 px-7 py-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-danger/10 flex items-center justify-center mt-0.5">
                        <AlertCircle size={20} className="text-danger" />
                      </div>
                      <div>
                        <h4 className="font-archivo text-sm font-bold text-danger-dark mb-1">Self-Assessment: Needs Review</h4>
                        <p className="text-sm text-danger-dark/70 leading-relaxed">
                          You marked your draft answer as needing more study.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {current.type === 'case' && (
                  isCorrect ? (
                    <div className="rounded-3xl bg-success/[0.04] border border-success/15 px-7 py-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center mt-0.5">
                        <Check size={20} className="text-success" />
                      </div>
                      <div>
                        <h4 className="font-archivo text-sm font-bold text-success-dark mb-1">Case Completed!</h4>
                        <p className="text-sm text-success-dark/70 leading-relaxed">
                          Great job — you answered all parts of this clinical case study correctly.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl bg-danger/[0.04] border border-danger/15 px-7 py-5 flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-danger/10 flex items-center justify-center mt-0.5">
                        <AlertCircle size={20} className="text-danger" />
                      </div>
                      <div>
                        <h4 className="font-archivo text-sm font-bold text-danger-dark mb-1">Case Completed with Review</h4>
                        <p className="text-sm text-danger-dark/70 leading-relaxed">
                          You completed the case. Review any incorrect parts highlighted above.
                        </p>
                      </div>
                    </div>
                  )
                )}

                {current.explanation && (
                  <div className="rounded-3xl bg-success/[0.04] border border-success/15 px-7 py-5 flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center mt-0.5">
                      <Lightbulb size={20} className="text-success" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-archivo text-sm font-bold text-success-dark mb-1">
                        {current.type === 'mcq' || current.type === 'truefalse'
                          ? `Correct Answer: ${current.options?.[current.correctIndex ?? 0]}`
                          : 'Explanation'}
                      </h4>
                      {renderFormattedText(current.explanation, "text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap text-left")}
                    </div>
                  </div>
                )}

                {current.keyConcept && (
                  <div className="rounded-3xl bg-biochem/[0.04] border border-biochem/15 px-7 py-5 flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-biochem/10 flex items-center justify-center mt-0.5">
                      <Bookmark size={20} className="text-biochem" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-archivo text-sm font-bold text-biochem-dark mb-1">Key Concept</h4>
                      {renderFormattedText(current.keyConcept, "text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap text-left")}
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
                      const q = questions[idx];
                      const ans = answers[idx];
                      const isCurrent = idx === currentIdx;
                      const isCompleted = ans !== undefined && isQuestionCompleted(q, ans);
                      const wasCorrect = isCompleted && checkAnswerCorrect(q, ans, idx);
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
                              : isCompleted
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
          <div className="w-full xl:w-72 flex-shrink-0">
            <div className="xl:sticky xl:top-24 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-5">

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
                    { label: 'Remaining', value: totalPoints - answeredCount, color: 'bg-gray-300 dark:bg-gray-600', textColor: 'text-gray-400 dark:text-gray-500' },
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
                    const isCompleted = ans !== undefined && isQuestionCompleted(q, ans);
                    const wasCorrect = isCompleted && checkAnswerCorrect(q, ans, idx);
                    const isFlagged = flagged.has(idx);

                    let cls = 'w-full aspect-square rounded-xl flex items-center justify-center text-xs font-bold cursor-pointer transition-all border-2 ';
                    if (isCurrent) cls += 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900 ring-4 ring-gray-900/10 dark:ring-white/10';
                    else if (isFlagged) cls += 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400';
                    else if (wasCorrect) cls += 'bg-success/10 border-success/30 text-success';
                    else if (isCompleted) cls += 'bg-danger/10 border-danger/30 text-danger';
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
              <div className={`sidebar-card bg-gradient-to-br ${s.bgOp5} to-clinical/5 rounded-3xl p-5 ${s.borderOp10} border md:col-span-2 xl:col-span-1`}>
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

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-8 text-center space-y-1.5">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          Endocrine Module Quiz • Chapter {chapter.id}: {chapter.title} • {subject ? subject.name : 'All Subjects'}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">
          For inquiries or to report errors, please contact:{' '}
          <a href="mailto:omarhmaged@gmail.com" className="hover:text-gray-900 dark:hover:text-white transition-colors underline font-semibold">
            omarhmaged@gmail.com
          </a>
        </p>
      </div>
      {/* KEYBOARD SHORTCUTS HELPER MODAL */}
      {showKeyboardHelper && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-[30px] border border-gray-100 dark:border-gray-800 max-w-md w-full p-8 shadow-2xl relative overflow-hidden feedback-animate">
            <button
              onClick={() => setShowKeyboardHelper(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-physiology/10 flex items-center justify-center text-physiology">
                <Keyboard size={20} />
              </div>
              <h3 className="font-archivo text-lg font-bold text-gray-900 dark:text-white">Keyboard Shortcuts</h3>
            </div>

            <div className="space-y-4">
              {[
                { keys: ['A', 'B', 'C', 'D'], desc: 'Select Option A, B, C, or D' },
                { keys: ['F'], desc: 'Flag / Unflag Question' },
                { keys: ['←', '→'], desc: 'Navigate to Previous / Next Question' },
                { keys: ['Enter'], desc: 'Advance to Next Question / Finish Quiz' },
                { keys: ['Esc'], desc: 'Close this shortcuts window' }
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-800/60 last:border-b-0">
                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 text-left">{item.desc}</span>
                  <div className="flex gap-1 flex-shrink-0">
                    {item.keys.map((k) => (
                      <kbd key={k} className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-mono text-xs font-bold text-gray-800 dark:text-gray-200 shadow-sm">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowKeyboardHelper(false)}
              className="mt-6 w-full py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-2xl text-xs hover:scale-[0.98] transition-transform"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface TimerProps {
  onTick: (seconds: number) => void;
}

function QuizTimer({ onTick }: TimerProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setSeconds((s) => {
        const next = s + 1;
        onTick(next);
        return next;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [onTick]);

  return (
    <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
      <Clock size={14} className="text-gray-400 dark:text-gray-500" />
      <span className="text-sm font-semibold text-gray-600 dark:text-gray-400 tabular-nums">{formatTime(seconds)}</span>
    </div>
  );
}
