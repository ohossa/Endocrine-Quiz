import { useState } from 'react';
import { ChapterData, SubjectData, Question, Screen } from './types';
import { shuffleArray } from './data';
import { ChapterSelect } from './components/ChapterSelect';
import { SubjectSelect } from './components/SubjectSelect';
import { QuizInterface } from './components/QuizInterface';
import { ResultsDashboard } from './components/ResultsDashboard';
import { ThemeProvider } from './context/ThemeContext';
import { saveQuizResult } from './utils/storage';

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

  const handleSelectChapter = (chapter: ChapterData) => {
    setSelectedChapter(chapter);
    setScreen('subjects');
  };

  const handleSelectSubject = (subject: SubjectData, questions: Question[]) => {
    setQuizPayload({ chapter: selectedChapter!, subject, questions });
    setScreen('quiz');
  };

  const handleQuickStart = (questions: Question[]) => {
    setQuizPayload({ chapter: selectedChapter!, subject: null, questions });
    setScreen('quiz');
  };

  const handleFinishQuiz = (answers: Record<number, number>, elapsedSeconds: number, flaggedQuestions: Set<number>) => {
    const questions = quizPayload!.questions;
    const correct = questions.filter((q, i) => answers[i] === q.correctIndex).length;
    const total = questions.length;
    saveQuizResult({
      chapterId: quizPayload!.chapter.id,
      chapterTitle: quizPayload!.chapter.title,
      subjectName: quizPayload!.subject?.name ?? 'All Subjects',
      correct,
      total,
      pct: total > 0 ? Math.round((correct / total) * 100) : 0,
      elapsedSeconds,
    });
    setResultPayload({ chapter: quizPayload!.chapter, subject: quizPayload!.subject, questions, answers, elapsedSeconds, flaggedQuestions });
    setScreen('results');
  };

  const handleRetake = () => {
    if (!quizPayload) return;
    setQuizPayload({ ...quizPayload, questions: shuffleArray(quizPayload.questions) });
    setScreen('quiz');
  };

  const handleBackToChapters = () => {
    setSelectedChapter(null);
    setQuizPayload(null);
    setResultPayload(null);
    setScreen('chapters');
  };

  return (
    <ThemeProvider>
      {screen === 'chapters' && <ChapterSelect onSelectChapter={handleSelectChapter} />}
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
