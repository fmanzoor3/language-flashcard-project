/**
 * Listening Lesson Service
 * Generates listening lessons using Azure OpenAI
 */

import { chatCompletion } from './openaiClient';
import type {
  Scenario,
  ListeningLesson,
  ListeningExercise,
  ListeningExerciseType,
  ComprehensionQuestion,
  DifficultyLevel,
} from '../../types';

export interface LessonGenerationOptions {
  difficulty: DifficultyLevel;
  exerciseTypes: ListeningExerciseType[];
  exerciseCount: number;
}

const DIFFICULTY_GUIDANCE: Record<DifficultyLevel, {
  sentenceLength: string;
  vocabulary: string;
  grammarNotes: string;
  exampleSentences: string;
}> = {
  A1: {
    sentenceLength: '3-6 words per sentence',
    vocabulary: 'Basic greetings (merhaba, günaydın), numbers (bir, iki, üç), common nouns (ev, su, ekmek), simple verbs (var, yok, git-, gel-)',
    grammarNotes: 'Simple present tense, basic questions with "mi/mı", possessive suffixes (-im, -in), locative (-de/-da)',
    exampleSentences: 'Ben Türküm. Su var mı? Evde miyiz? Merhaba, nasılsınız?',
  },
  A2: {
    sentenceLength: '5-10 words per sentence',
    vocabulary: 'Everyday actions, time expressions (bugün, yarın, dün), food, transport, family members',
    grammarNotes: 'Past tense (-di/-dı), future with -(y)ecek, object markers (-i/-ı), ablative (-den/-dan)',
    exampleSentences: 'Dün markete gittim. Yarın ne yapacaksın? Kahvaltıda ekmek yedik.',
  },
  B1: {
    sentenceLength: '8-15 words per sentence',
    vocabulary: 'Abstract concepts, emotions, work vocabulary, formal expressions',
    grammarNotes: 'Reported speech (-miş), conditional (-se/-sa), relative clauses, passive voice',
    exampleSentences: 'Toplantıya geç kalmışsınız. Hava güzel olursa pikniğe gideriz. Okuduğum kitap çok ilginç.',
  },
  B2: {
    sentenceLength: '10-20 words per sentence',
    vocabulary: 'Idiomatic expressions, professional vocabulary, nuanced adjectives',
    grammarNotes: 'Complex subordinate clauses, optative (-e/-a), aorist tense, verbal nouns',
    exampleSentences: 'Keşke daha erken başlasaydık. Bu konuyu ele almak için önce tarihsel arka planı inceleyelim.',
  },
  C1: {
    sentenceLength: '15-25 words per sentence',
    vocabulary: 'Literary expressions, specialized terms, subtle distinctions',
    grammarNotes: 'Advanced embedded clauses, formal register variations, archaic forms',
    exampleSentences: 'Söz konusu mesele, toplumsal değişimin kaçınılmaz sonuçlarından biri olarak değerlendirilmelidir.',
  },
  C2: {
    sentenceLength: '20+ words per sentence',
    vocabulary: 'Native-level fluency with regional variations, proverbs, cultural references',
    grammarNotes: 'All grammatical structures including rare and literary forms',
    exampleSentences: 'Atasözümüz "damlaya damlaya göl olur" der; bu da sabır ve istikrarın önemini vurgular.',
  },
};

/**
 * Generate a listening lesson based on a scenario
 */
export async function generateListeningLesson(
  scenario: Scenario,
  options?: LessonGenerationOptions
): Promise<ListeningLesson> {
  const difficulty = options?.difficulty || scenario.difficulty;
  const exerciseTypes = options?.exerciseTypes || ['dictation', 'comprehension'];
  const exerciseCount = options?.exerciseCount || 6;

  const guidance = DIFFICULTY_GUIDANCE[difficulty];

  // Calculate exercise distribution
  const hasDictation = exerciseTypes.includes('dictation');
  const hasComprehension = exerciseTypes.includes('comprehension');

  let dictationCount = 0;
  let comprehensionCount = 0;

  if (hasDictation && hasComprehension) {
    dictationCount = Math.ceil(exerciseCount * 0.67); // ~67% dictation
    comprehensionCount = exerciseCount - dictationCount;
  } else if (hasDictation) {
    dictationCount = exerciseCount;
  } else {
    comprehensionCount = exerciseCount;
  }

  const exerciseInstructions = [];

  if (dictationCount > 0) {
    exerciseInstructions.push(`${dictationCount} DICTATION exercises where the user listens and types what they hear`);
  }
  if (comprehensionCount > 0) {
    exerciseInstructions.push(`${comprehensionCount} COMPREHENSION exercises where the user listens to a passage and answers questions`);
  }

  const prompt = `You are a Turkish language expert. Create a listening lesson for Turkish learners.

SCENARIO CONTEXT:
- Topic: ${scenario.title} (${scenario.titleTurkish})
- Description: ${scenario.description}
- Target vocabulary: ${scenario.vocabularyFocus?.join(', ') || 'general conversation'}
- Grammar focus: ${scenario.grammarFocus?.join(', ') || 'general'}

DIFFICULTY LEVEL: ${difficulty}
- Sentence complexity: ${guidance.sentenceLength}
- Vocabulary scope: ${guidance.vocabulary}
- Grammar features: ${guidance.grammarNotes}
- Example sentences at this level: ${guidance.exampleSentences}

EXERCISE REQUIREMENTS:
Generate exactly ${exerciseCount} exercises:
${exerciseInstructions.join('\n')}

CRITICAL TURKISH LANGUAGE RULES:
1. ALL Turkish text MUST be grammatically correct and natural-sounding
2. Use ONLY real Turkish words - no invented or incorrect forms
3. Apply vowel harmony correctly (e/a, i/ı/u/ü patterns)
4. Use correct suffixes and their variants (-de/-da/-te/-ta, -den/-dan/-ten/-tan, etc.)
5. Word order should be natural (typically Subject-Object-Verb)
6. For ${difficulty} level, sentences should feel like native Turkish speech

FOR DICTATION EXERCISES:
- Create realistic, contextual sentences a Turkish speaker would actually say
- The audioText must be something natural to hear in the scenario context
- Hints should progressively reveal: (1) first word, (2) sentence structure, (3) full answer

FOR COMPREHENSION EXERCISES:
- Create a coherent mini-story or dialogue (not random sentences)
- The passage should have a clear beginning, middle, point
- Questions should test understanding of meaning, not just word recognition

Respond with ONLY valid JSON (no markdown, no code blocks):
{
  "title": "English lesson title",
  "titleTurkish": "Turkish lesson title",
  "description": "Brief description",
  "estimatedMinutes": ${Math.ceil(exerciseCount * 1.5)},
  "vocabularyFocus": ["key", "Turkish", "words", "from", "exercises"],
  "grammarFocus": ["grammar patterns used"],
  "exercises": [
    {
      "type": "dictation",
      "order": 1,
      "audioText": "Natural Turkish sentence",
      "audioTextTranslation": "English translation",
      "targetText": "Same as audioText",
      "acceptableVariants": [],
      "hints": ["İlk kelime: ...", "Cümle yapısı: ...", "Tam cevap: ..."]
    },
    {
      "type": "comprehension",
      "order": ${dictationCount + 1},
      "audioText": "Longer Turkish passage telling a coherent story...",
      "audioTextTranslation": "English translation of passage",
      "questions": [
        {
          "questionText": "Soru Türkçe?",
          "questionTranslation": "Question in English?",
          "questionType": "multiple-choice",
          "options": ["A seçeneği", "B seçeneği", "C seçeneği", "D seçeneği"],
          "correctAnswer": "A seçeneği",
          "explanation": "Why this is correct"
        }
      ]
    }
  ]
}`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 4000 }
  );

  try {
    const parsed = JSON.parse(response);

    // Generate IDs for exercises and questions
    const exercises: ListeningExercise[] = parsed.exercises.map(
      (ex: Omit<ListeningExercise, 'id' | 'difficulty'>, index: number) => ({
        ...ex,
        id: `ex-${Date.now()}-${index}`,
        difficulty: difficulty,
        questions: ex.questions?.map((q: Omit<ComprehensionQuestion, 'id'>, qIndex: number) => ({
          ...q,
          id: `q-${Date.now()}-${index}-${qIndex}`,
        })),
      })
    );

    const lesson: ListeningLesson = {
      id: `lesson-${Date.now()}`,
      title: parsed.title,
      titleTurkish: parsed.titleTurkish,
      description: parsed.description,
      difficulty: difficulty,
      scenarioId: scenario.id,
      vocabularyFocus: parsed.vocabularyFocus || scenario.vocabularyFocus || [],
      grammarFocus: parsed.grammarFocus || scenario.grammarFocus || [],
      estimatedMinutes: parsed.estimatedMinutes || Math.ceil(exerciseCount * 1.5),
      exercises,
      createdAt: new Date(),
      isGenerated: true,
    };

    return lesson;
  } catch (error) {
    console.error('Failed to parse lesson response:', response);
    throw new Error('Failed to generate listening lesson. Please try again.');
  }
}

/**
 * Generate additional exercises for an existing lesson
 */
export async function generateAdditionalExercises(
  lesson: ListeningLesson,
  count: number = 3
): Promise<ListeningExercise[]> {
  const guidance = DIFFICULTY_GUIDANCE[lesson.difficulty];

  const prompt = `Generate ${count} more Turkish listening exercises for this lesson:

Lesson: ${lesson.title}
Difficulty: ${lesson.difficulty}
Vocabulary Focus: ${lesson.vocabularyFocus.join(', ')}
Grammar Focus: ${lesson.grammarFocus.join(', ')}

Language guidance:
- ${guidance.sentenceLength}
- ${guidance.grammarNotes}

Existing exercises cover: ${lesson.exercises.map((e) => e.audioText).join('; ')}

Generate NEW exercises that don't repeat existing content.
All Turkish MUST be grammatically correct with proper vowel harmony.

Respond with ONLY JSON array:
[
  {
    "type": "dictation",
    "audioText": "Natural Turkish sentence",
    "audioTextTranslation": "English translation",
    "targetText": "Expected answer",
    "hints": ["hint1", "hint2", "full answer"]
  }
]`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.7 }
  );

  try {
    const parsed = JSON.parse(response);

    return parsed.map((ex: Omit<ListeningExercise, 'id' | 'order' | 'difficulty'>, index: number) => ({
      ...ex,
      id: `ex-${Date.now()}-add-${index}`,
      order: lesson.exercises.length + index + 1,
      difficulty: lesson.difficulty,
    }));
  } catch {
    return [];
  }
}

/**
 * Get a pronunciation guide for Turkish text
 */
export async function getPronunciationGuide(text: string): Promise<string> {
  const prompt = `Provide a simple pronunciation guide for this Turkish text. Use phonetic representations that an English speaker can understand.

Turkish: "${text}"

Respond with ONLY the phonetic pronunciation, no explanations.
Example: "Merhaba" → "mehr-HAH-bah"`;

  return chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.3 }
  );
}

/**
 * Generate feedback for a dictation answer
 */
export async function generateDictationFeedback(
  userAnswer: string,
  correctAnswer: string,
  difficulty: DifficultyLevel
): Promise<{ feedback: string; corrections: string[] }> {
  const prompt = `Compare this Turkish dictation answer:

User wrote: "${userAnswer}"
Correct answer: "${correctAnswer}"
Learner level: ${difficulty}

Identify specific differences and provide helpful feedback.

Respond with ONLY JSON:
{
  "feedback": "Brief, encouraging feedback about their attempt",
  "corrections": ["specific correction 1", "specific correction 2"]
}`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.3 }
  );

  try {
    return JSON.parse(response);
  } catch {
    return {
      feedback: 'Keep practicing!',
      corrections: [],
    };
  }
}
