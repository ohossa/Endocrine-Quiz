import { ChapterData, Question, SubjectColor, SubjectData } from './types';
import rawData from '../imports/endocrine-data-fixed.json';

// ── Raw JSON types ─────────────────────────────────────────────────────────

type RawQuestion = {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
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
  const idx = letterToIndex(q.correctAnswer);
  
  // More robust true/false detection - check if exactly 2 options and they contain true/false or yes/no variations
  const opt0Lower = q.options[0]?.toLowerCase().trim() ?? '';
  const opt1Lower = q.options[1]?.toLowerCase().trim() ?? '';
  
  const isTrueFalse =
    q.options.length === 2 &&
    ((opt0Lower === 'true' || opt0Lower.startsWith('true')) && (opt1Lower === 'false' || opt1Lower.startsWith('false'))) ||
    ((opt0Lower === 'yes' || opt0Lower.startsWith('yes')) && (opt1Lower === 'no' || opt1Lower.startsWith('no'))) ||
    ((opt0Lower === 'correct' || opt0Lower.startsWith('correct')) && (opt1Lower === 'incorrect' || opt1Lower.startsWith('incorrect')));

  return {
    id: q.id,
    type: isTrueFalse ? 'truefalse' : 'mcq',
    text: q.question,
    lecture: 1,
    subjectColor: color,
    options: q.options,
    correctIndex: idx >= 0 && idx < q.options.length ? idx : 0,
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
