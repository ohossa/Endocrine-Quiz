import { useState } from 'react';
import { ChapterData, SubjectData, Question, Screen } from './types';
import { shuffleArray, chapters } from './data';
import { ChapterSelect } from './components/ChapterSelect';
import { SubjectSelect } from './components/SubjectSelect';
import { QuizInterface } from './components/QuizInterface';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ThemeProvider } from './context/ThemeContext';
import { saveQuizResult, QuizResult } from './utils/storage';

interface QuizPayload {
  chapter: ChapterData;
  subject: SubjectData | null;
  questions: Question[];
}

interface ResultPayload {
  chapter: ChapterData;
  subject: SubjectData | null;
  questions: Question[];
  answers: Record<number, number>;
  elapsedSeconds: number;
  flaggedQuestions: Set<number>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('chapters');
  const [selectedChapter, setSelectedChapter] = useState<ChapterData | null>(null);
  const [quizPayload, setQuizPayload] = useState<QuizPayload | null>(null);
  const [resultPayload, setResultPayload] = useState<ResultPayload | null>(null);

  const transitionTo = (fn: () => void) => {
    // @ts-ignore
    if (document.startViewTransition) {
      // @ts-ignore
      document.startViewTransition(fn);
    } else {
      fn();
    }
  };

  const handleSelectChapter = (chapter: ChapterData) => {
    transitionTo(() => {
      setSelectedChapter(chapter);
      setScreen('subjects');
    });
  };

  const handleSelectSubject = (subject: SubjectData, questions: Question[]) => {
    transitionTo(() => {
      setQuizPayload({ chapter: selectedChapter!, subject, questions });
      setScreen('quiz');
    });
  };

  const handleQuickStart = (questions: Question[]) => {
    transitionTo(() => {
      setQuizPayload({ chapter: selectedChapter!, subject: null, questions });
      setScreen('quiz');
    });
  };

  const handleFinishQuiz = (answers: Record<number, any>, elapsedSeconds: number, flaggedQuestions: Set<number>) => {
    const questions = quizPayload!.questions;
    const correct = questions.filter((q, i) => {
      if (q.type === 'essay') {
        return answers[i]?.selfGrade === 'correct';
      }
      if (q.type === 'matching') {
        const student = answers[i]?.matches || {};
        if (!q.pairs || Object.keys(student).length !== q.pairs.length) return false;
        // Check if all matched targets are correct
        return q.pairs.every((pair, pIdx) => {
          const tIdx = student[pIdx];
          const scrambled = answers[i]?.scrambled || [];
          return scrambled[tIdx] === pair.target;
        });
      }
      return answers[i] === q.correctIndex;
    }).length;
    const total = questions.length;
    saveQuizResult({
      chapterId: quizPayload!.chapter.id,
      chapterTitle: quizPayload!.chapter.title,
      subjectName: quizPayload!.subject?.name ?? 'All Subjects',
      correct,
      total,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      elapsedSeconds,
      questionIds: questions.map(q => q.id),
      answers,
      flaggedQuestionIds: Array.from(flaggedQuestions),
    });
    transitionTo(() => {
      setResultPayload({ chapter: quizPayload!.chapter, subject: quizPayload!.subject, questions, answers, elapsedSeconds, flaggedQuestions });
      setScreen('results');
    });
  };

  const handleSelectHistory = (result: QuizResult) => {
    const chapter = chapters.find(c => c.id === result.chapterId);
    if (!chapter) return;

    const subject = chapter.subjects.find(s => s.name === result.subjectName) || null;

    let questions: Question[] = [];
    if (result.questionIds && result.questionIds.length > 0) {
      questions = result.questionIds
        .map(id => {
          for (const ch of chapters) {
            for (const sub of ch.subjects) {
              const q = sub.questions.find(q => q.id === id);
              if (q) return q;
            }
          }
          return null;
        })
        .filter((q): q is Question => q !== null);
    } else {
      questions = subject ? subject.questions : chapter.subjects.flatMap(s => s.questions);
      questions = questions.slice(0, result.total);
    }

    const answers = result.answers || {};
    const flaggedQuestions = new Set<number>(result.flaggedQuestionIds || []);

    transitionTo(() => {
      setSelectedChapter(chapter);
      setQuizPayload({ chapter, subject, questions });
      setResultPayload({ chapter, subject, questions, answers, elapsedSeconds: result.elapsedSeconds, flaggedQuestions });
      setScreen('results');
    });
  };

  const handleRetake = () => {
    if (!quizPayload) return;
    transitionTo(() => {
      setQuizPayload({ ...quizPayload, questions: quizPayload.questions });
      setScreen('quiz');
    });
  };

  const handleBackToChapters = () => {
    transitionTo(() => {
      setSelectedChapter(null);
      setQuizPayload(null);
      setResultPayload(null);
      setScreen('chapters');
    });
  };

  return (
    <ThemeProvider>
      {screen === 'chapters' && (
        <ChapterSelect
          onSelectChapter={handleSelectChapter}
          onSelectHistory={handleSelectHistory}
        />
      )}
      {screen === 'subjects' && selectedChapter && (
        <SubjectSelect
          chapter={selectedChapter}
          onBack={handleBackToChapters}
          onSelectSubject={handleSelectSubject}
          onQuickStart={handleQuickStart}
        />
      )}
      {screen === 'quiz' && quizPayload && (
        <QuizInterface
          chapter={quizPayload.chapter}
          subject={quizPayload.subject}
          questions={quizPayload.questions}
          onBack={() => setScreen('subjects')}
          onFinish={handleFinishQuiz}
        />
      )}
      {screen === 'results' && resultPayload && (
        <ResultsDashboard
          chapter={resultPayload.chapter}
          subject={resultPayload.subject}
          questions={resultPayload.questions}
          answers={resultPayload.answers}
          elapsedSeconds={resultPayload.elapsedSeconds}
          flaggedQuestions={resultPayload.flaggedQuestions}
          onRetake={handleRetake}
          onTryAnotherSubject={() => setScreen('subjects')}
          onBackToChapters={handleBackToChapters}
          onBackToSubjects={() => setScreen('subjects')}
        />
      )}
    </ThemeProvider>
  );
}
