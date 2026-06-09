import { ChapterData, Question, SubjectColor, SubjectData } from './types';
import rawData from '../imports/endocrine-data-fixed.json';

// ── Raw JSON types ─────────────────────────────────────────────────────────

type RawQuestionOption = {
  text: string;
  value: boolean;
} | string;

type RawQuestion = {
  id: number;
  question: string;
  options: RawQuestionOption[];
  correctAnswer: string | boolean;
};

type RawTopic = {
  topic: string;
  questions: RawQuestion[];
};

type RawChapter = {
  chapterTitle: string;
  topics: RawTopic[];
};

// ── Helpers ───────────────────────────────────────────────────────────

function letterToIndex(letter: string): number {
  return letter.toUpperCase().charCodeAt(0) - 65; // A→0, B→1, …
}

function topicToColor(topic: string): SubjectColor {
  const t = topic.toLowerCase();
  if (t.includes('anatomy')) return 'anatomy';
  if (t.includes('histology')) return 'histology';
  if (t.includes('physiology')) return 'physiology';
  if (t.includes('biochem')) return 'biochem';
  if (t.includes('pathology')) return 'pathology';
  if (t.includes('pharmacology')) return 'pharma';
  if (t.includes('clinical')) return 'clinical';
  return 'physiology'; // fallback for "Additional …" topics
}

const colorToName: Record<SubjectColor, string> = {
  anatomy: 'Anatomy',
  histology: 'Histology',
  physiology: 'Physiology',
  biochem: 'Biochemistry',
  pathology: 'Pathology',
  pharma: 'Pharmacology',
  clinical: 'Clinical',
};

const colorToIcon: Record<SubjectColor, string> = {
  anatomy: 'Bone',
  histology: 'Microscope',
  physiology: 'Activity',
  biochem: 'FlaskConical',
  pathology: 'ShieldAlert',
  pharma: 'Pill',
  clinical: 'Stethoscope',
};

const SUBJECT_ORDER: SubjectColor[] = [
  'anatomy',
  'histology',
  'physiology',
  'biochem',
  'pathology',
  'pharma',
  'clinical',
];

function transformQuestion(q: RawQuestion, color: SubjectColor): Question {
  // Extract option texts - handle both old string format and new object format
  const optionTexts = q.options.map(opt => {
    if (typeof opt === 'string') {
      return opt;
    }
    return opt.text;
  });

  // Detect if this is a true/false question
  const opt0Lower = optionTexts[0]?.toLowerCase().trim() ?? '';
  const opt1Lower = optionTexts[1]?.toLowerCase().trim() ?? '';
  
  const isTrueFalse =
    optionTexts.length === 2 &&
    (((opt0Lower === 'true' || opt0Lower.startsWith('true')) && (opt1Lower === 'false' || opt1Lower.startsWith('false'))) ||
    ((opt0Lower === 'yes' || opt0Lower.startsWith('yes')) && (opt1Lower === 'no' || opt1Lower.startsWith('no'))) ||
    ((opt0Lower === 'correct' || opt0Lower.startsWith('correct')) && (opt1Lower === 'incorrect' || opt1Lower.startsWith('incorrect'))));

  // Determine correct index based on correctAnswer format
  let correctIndex = 0;
  if (typeof q.correctAnswer === 'boolean') {
    // New format: boolean value
    correctIndex = q.correctAnswer ? 0 : 1; // true → index 0, false → index 1
  } else {
    // Old format: letter string (A, B, C, etc.)
    const idx = letterToIndex(q.correctAnswer);
    correctIndex = idx >= 0 && idx < optionTexts.length ? idx : 0;
  }

  return {
    id: q.id,
    type: isTrueFalse ? 'truefalse' : 'mcq',
    text: q.question,
    lecture: 1,
    subjectColor: color,
    options: optionTexts,
    correctIndex,
    explanation: '',
  };
}

// ── Chapter metadata ────────────────────────────────────────────────────────

const CHAPTER_META = [
  {
    id: 1,
    emoji: '🧠',
    page: 1,
    subtitle: 'Hypophysis cerebri',
    lectureRange: 'Lectures 1–13',
    accentColor: 'physiology' as SubjectColor,
  },
  {
    id: 2,
    emoji: '🦋',
    page: 70,
    subtitle: 'Glands',
    lectureRange: 'Lectures 14–24',
    accentColor: 'anatomy' as SubjectColor,
  },
  {
    id: 3,
    emoji: '⚡',
    page: 132,
    subtitle: 'Adrenal gland',
    lectureRange: 'Lectures 25–32',
    accentColor: 'pharma' as SubjectColor,
  },
  {
    id: 4,
    emoji: '🫀',
    page: 168,
    subtitle: 'Islets of Langerhans',
    lectureRange: 'Lectures 33–40',
    accentColor: 'biochem' as SubjectColor,
  },
  {
    id: 5,
    emoji: '💉',
    page: 212,
    subtitle: 'DM Management',
    lectureRange: 'Lectures 41–49',
    accentColor: 'pathology' as SubjectColor,
  },
];

// ── Builder ───────────────────────────────────────────────────────────

function buildChapter(
  raw: RawChapter,
  meta: (typeof CHAPTER_META)[number]
): ChapterData {
  // Group all questions by subject colour
  const subjectMap = new Map<SubjectColor, Question[]>();

  for (const topicData of raw.topics) {
    const color = topicToColor(topicData.topic);
    if (!subjectMap.has(color)) subjectMap.set(color, []);
    subjectMap
      .get(color)!
      .push(...topicData.questions.map((q) => transformQuestion(q, color)));
  }

  const subjects: SubjectData[] = SUBJECT_ORDER.filter((c) =>
    subjectMap.has(c)
  ).map((color) => ({
    id: color,
    name: colorToName[color],
    iconName: colorToIcon[color],
    lectures: '',
    lectureCount: 1,
    questions: subjectMap.get(color)!,
  }));

  return {
    id: meta.id,
    title: raw.chapterTitle,
    subtitle: meta.subtitle,
    emoji: meta.emoji,
    page: meta.page,
    lectureRange: meta.lectureRange,
    accentColor: meta.accentColor,
    subjects,
  };
}

// ── Exports ───────────────────────────────────────────────────────────

export const chapters: ChapterData[] = (
  rawData.chapters as RawChapter[]
).map((raw, i) => buildChapter(raw, CHAPTER_META[i]));

export function shuffleArray<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
