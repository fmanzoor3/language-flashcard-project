/**
 * Listening Lesson Service
 * Generates listening lessons using Azure OpenAI
 */

import { chatCompletion } from './openaiClient';
import type {
  Scenario,
  ListeningLesson,
  ListeningExercise,
  ComprehensionQuestion,
  DifficultyLevel,
} from '../../types';

const DIFFICULTY_GUIDANCE: Record<DifficultyLevel, { sentenceLength: string; vocabulary: string; speed: string }> = {
  A1: {
    sentenceLength: '3-6 words per sentence',
    vocabulary: 'Basic greetings, numbers, common objects, simple verbs',
    speed: 'Very slow and clear',
  },
  A2: {
    sentenceLength: '5-10 words per sentence',
    vocabulary: 'Everyday vocabulary, simple past tense, basic questions',
    speed: 'Slow and clear',
  },
  B1: {
    sentenceLength: '8-15 words per sentence',
    vocabulary: 'Varied vocabulary, all common tenses, idioms occasionally',
    speed: 'Normal conversational pace',
  },
  B2: {
    sentenceLength: '10-20 words per sentence',
    vocabulary: 'Rich vocabulary, complex structures, idioms',
    speed: 'Natural conversational pace',
  },
  C1: {
    sentenceLength: '15-25 words per sentence',
    vocabulary: 'Sophisticated vocabulary, nuanced expressions',
    speed: 'Fast natural speech',
  },
  C2: {
    sentenceLength: '20+ words per sentence',
    vocabulary: 'Native-level vocabulary, colloquialisms, wordplay',
    speed: 'Native speaker pace',
  },
};

/**
 * Generate a listening lesson based on a scenario
 */
export async function generateListeningLesson(scenario: Scenario): Promise<ListeningLesson> {
  const guidance = DIFFICULTY_GUIDANCE[scenario.difficulty];

  const prompt = `Create a Turkish listening lesson based on this scenario:

Scenario: ${scenario.title} (${scenario.titleTurkish})
Description: ${scenario.description}
Difficulty: ${scenario.difficulty}
Vocabulary Focus: ${scenario.vocabularyFocus?.join(', ') || 'general'}
Grammar Focus: ${scenario.grammarFocus?.join(', ') || 'general'}

Language guidance for ${scenario.difficulty} level:
- Sentence length: ${guidance.sentenceLength}
- Vocabulary: ${guidance.vocabulary}
- Speaking speed: ${guidance.speed}

Generate 6 exercises total:
- 4 dictation exercises (user listens and types what they hear)
- 2 comprehension exercises (user listens to a passage and answers questions)

Respond with ONLY JSON (no markdown code blocks):
{
  "title": "English lesson title",
  "titleTurkish": "Turkish lesson title",
  "description": "Brief description of what the lesson covers",
  "estimatedMinutes": 10,
  "vocabularyFocus": ["word1", "word2", "word3"],
  "grammarFocus": ["grammar point 1", "grammar point 2"],
  "exercises": [
    {
      "type": "dictation",
      "order": 1,
      "audioText": "Turkish text to be spoken (appropriate for ${scenario.difficulty} level)",
      "audioTextTranslation": "English translation",
      "targetText": "Expected written answer (same as audioText or acceptable variant)",
      "acceptableVariants": ["alternative acceptable spellings"],
      "hints": ["First word is...", "The sentence structure is...", "Full answer"]
    },
    {
      "type": "comprehension",
      "order": 5,
      "audioText": "A longer Turkish passage (30-60 words for ${scenario.difficulty})",
      "audioTextTranslation": "English translation of the passage",
      "questions": [
        {
          "questionText": "Question in Turkish",
          "questionTranslation": "Question in English",
          "questionType": "multiple-choice",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Why this is correct"
        },
        {
          "questionText": "Another question in Turkish",
          "questionTranslation": "Another question in English",
          "questionType": "true-false",
          "options": ["Doğru (True)", "Yanlış (False)"],
          "correctAnswer": "Doğru (True)",
          "explanation": "Why this is correct"
        }
      ]
    }
  ]
}

Make sure:
1. All Turkish text is grammatically correct and natural
2. Dictation exercises gradually increase in difficulty within the lesson
3. Comprehension passages are coherent stories/dialogues related to the scenario
4. Questions test actual understanding, not just word matching
5. Hints for dictation go from subtle to complete answer
6. Include vocabulary from the focus list where possible`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 3000 }
  );

  try {
    const parsed = JSON.parse(response);

    // Generate IDs for exercises and questions
    const exercises: ListeningExercise[] = parsed.exercises.map(
      (ex: Omit<ListeningExercise, 'id' | 'difficulty'>, index: number) => ({
        ...ex,
        id: `ex-${Date.now()}-${index}`,
        difficulty: scenario.difficulty,
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
      difficulty: scenario.difficulty,
      scenarioId: scenario.id,
      vocabularyFocus: parsed.vocabularyFocus || scenario.vocabularyFocus || [],
      grammarFocus: parsed.grammarFocus || scenario.grammarFocus || [],
      estimatedMinutes: parsed.estimatedMinutes || 10,
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
  const prompt = `Generate ${count} more Turkish listening exercises for this lesson:

Lesson: ${lesson.title}
Difficulty: ${lesson.difficulty}
Vocabulary Focus: ${lesson.vocabularyFocus.join(', ')}
Grammar Focus: ${lesson.grammarFocus.join(', ')}

Existing exercises cover: ${lesson.exercises.map((e) => e.audioText).join('; ')}

Generate NEW exercises that don't repeat existing content.
Mix of dictation and comprehension types.

Respond with ONLY JSON array:
[
  {
    "type": "dictation",
    "audioText": "Turkish text",
    "audioTextTranslation": "English translation",
    "targetText": "Expected answer",
    "hints": ["hint1", "hint2", "full answer"]
  }
]`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.8 }
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
