/**
 * Conversation Service
 * Manages Turkish conversation practice with Azure OpenAI
 */

import { chatCompletion, streamChatCompletion, type ChatMessage } from './openaiClient';
import type { Scenario, DifficultyLevel, ConversationMessage } from '../../types';

const DIFFICULTY_INSTRUCTIONS: Record<DifficultyLevel, string> = {
  A1: `The user is a complete beginner (A1 level). Use only the most basic vocabulary and simple present tense.
       Keep sentences very short (3-5 words). Speak slowly and clearly.
       Focus on greetings, numbers, basic nouns, and simple questions.`,
  A2: `The user is an elementary learner (A2 level). Use basic vocabulary and simple grammar structures.
       Use present tense and basic past tense. Keep sentences short but allow compound sentences.
       Include common everyday phrases and expressions.`,
  B1: `The user is intermediate (B1 level). Use varied vocabulary and grammar including all tenses.
       Use more complex sentence structures. Include idiomatic expressions occasionally.
       Can discuss familiar topics and express opinions.`,
  B2: `The user is upper-intermediate (B2 level). Use rich vocabulary and complex grammar.
       Include idioms and colloquial expressions. Can discuss abstract topics.
       Correct significant errors politely.`,
  C1: `The user is advanced (C1 level). Use sophisticated vocabulary and complex structures.
       Include nuanced expressions, humor, and cultural references.
       Speak naturally as you would to a native speaker.`,
  C2: `The user is proficient (C2 level). Speak completely naturally with full complexity.
       Include subtle nuances, wordplay, and cultural depth.
       Treat them as a near-native speaker.`,
};

export const PRESET_SCENARIOS: Scenario[] = [
  {
    id: 'restaurant-1',
    type: 'restaurant',
    title: 'Ordering at a Restaurant',
    titleTurkish: 'Restoranda Sipariş Verme',
    description: 'Practice ordering food and drinks at a Turkish restaurant',
    difficulty: 'A1',
    vocabularyFocus: ['yemek', 'içecek', 'hesap', 'menü', 'lütfen', 'teşekkürler'],
    grammarFocus: ['istiyorum', 'var mı', 'ne kadar'],
    isPreset: true,
  },
  {
    id: 'restaurant-2',
    type: 'restaurant',
    title: 'Restaurant Conversation',
    titleTurkish: 'Restoran Sohbeti',
    description: 'Have a full dining experience conversation with a waiter',
    difficulty: 'B1',
    vocabularyFocus: ['rezervasyon', 'önermek', 'tatlı', 'bahşiş'],
    grammarFocus: ['conditional', 'past tense', 'recommendations'],
    isPreset: true,
  },
  {
    id: 'shopping-1',
    type: 'shopping',
    title: 'At the Market',
    titleTurkish: 'Pazarda',
    description: 'Buy fruits and vegetables at a Turkish bazaar',
    difficulty: 'A2',
    vocabularyFocus: ['meyve', 'sebze', 'kilo', 'fiyat', 'pazarlık'],
    grammarFocus: ['numbers', 'quantities', 'how much'],
    isPreset: true,
  },
  {
    id: 'shopping-2',
    type: 'shopping',
    title: 'Clothes Shopping',
    titleTurkish: 'Giyim Alışverişi',
    description: 'Shop for clothes and negotiate prices',
    difficulty: 'B1',
    vocabularyFocus: ['beden', 'renk', 'kumaş', 'indirim', 'denemek'],
    grammarFocus: ['comparisons', 'preferences', 'conditions'],
    isPreset: true,
  },
  {
    id: 'travel-1',
    type: 'travel',
    title: 'Asking for Directions',
    titleTurkish: 'Yol Tarifi Sorma',
    description: 'Learn to ask and understand directions in Turkish',
    difficulty: 'A2',
    vocabularyFocus: ['sağ', 'sol', 'düz', 'köşe', 'yakın', 'uzak'],
    grammarFocus: ['imperative', 'locative case', 'directions'],
    isPreset: true,
  },
  {
    id: 'travel-2',
    type: 'travel',
    title: 'At the Airport',
    titleTurkish: 'Havalimanında',
    description: 'Navigate check-in, customs, and boarding',
    difficulty: 'B1',
    vocabularyFocus: ['bagaj', 'pasaport', 'kapı', 'uçuş', 'gecikme'],
    grammarFocus: ['future tense', 'time expressions', 'passive voice'],
    isPreset: true,
  },
  {
    id: 'healthcare-1',
    type: 'healthcare',
    title: 'At the Pharmacy',
    titleTurkish: 'Eczanede',
    description: 'Describe symptoms and buy medicine',
    difficulty: 'A2',
    vocabularyFocus: ['ilaç', 'ağrı', 'hasta', 'reçete', 'baş ağrısı'],
    grammarFocus: ['body parts', 'symptoms', 'needs'],
    isPreset: true,
  },
  {
    id: 'healthcare-2',
    type: 'healthcare',
    title: 'Doctor Appointment',
    titleTurkish: 'Doktor Randevusu',
    description: 'Describe health issues and understand medical advice',
    difficulty: 'B2',
    vocabularyFocus: ['semptom', 'tedavi', 'muayene', 'tahlil'],
    grammarFocus: ['complex descriptions', 'medical terms', 'instructions'],
    isPreset: true,
  },
  {
    id: 'work-1',
    type: 'work',
    title: 'Job Interview',
    titleTurkish: 'İş Görüşmesi',
    description: 'Practice a job interview in Turkish',
    difficulty: 'B2',
    vocabularyFocus: ['deneyim', 'beceri', 'maaş', 'proje', 'takım'],
    grammarFocus: ['past achievements', 'future plans', 'formal speech'],
    isPreset: true,
  },
  {
    id: 'social-1',
    type: 'social',
    title: 'Meeting New People',
    titleTurkish: 'Yeni İnsanlarla Tanışma',
    description: 'Introduce yourself and make small talk',
    difficulty: 'A1',
    vocabularyFocus: ['merhaba', 'isim', 'nereli', 'meslek', 'hobi'],
    grammarFocus: ['to be', 'questions', 'introductions'],
    isPreset: true,
  },
  {
    id: 'social-2',
    type: 'social',
    title: 'Turkish Tea Time',
    titleTurkish: 'Çay Saati',
    description: 'Have a casual conversation over Turkish tea',
    difficulty: 'B1',
    vocabularyFocus: ['çay', 'sohbet', 'aile', 'hava', 'tatil'],
    grammarFocus: ['opinions', 'experiences', 'casual speech'],
    isPreset: true,
  },
];

export type TranslationMode = 'none' | 'always' | 'on-request';

export interface ConversationOptions {
  difficulty: DifficultyLevel;
  translationMode: TranslationMode;
  responseMode: 'free-text' | 'word-bank' | 'hybrid';
}

function buildSystemPrompt(scenario: Scenario, options: ConversationOptions): string {
  const difficultyInstructions = DIFFICULTY_INSTRUCTIONS[options.difficulty];

  const scenarioContext = scenario.type === 'custom' && scenario.customPrompt
    ? scenario.customPrompt
    : getScenarioContext(scenario);

  const responseModeInstructions = options.responseMode === 'word-bank'
    ? `After each of your responses, provide a JSON block with suggested words the user might need:
       [WORD_BANK]{"words": [{"turkish": "word", "english": "translation"}, ...]}[/WORD_BANK]
       Include 4-6 relevant words for their potential response.`
    : options.responseMode === 'hybrid'
    ? `Occasionally (every 2-3 messages), provide helpful vocabulary:
       [WORD_BANK]{"words": [{"turkish": "word", "english": "translation"}, ...]}[/WORD_BANK]`
    : '';

  // Translation instructions based on user preference
  let translationInstructions: string;
  if (options.translationMode === 'none') {
    translationInstructions = `IMPORTANT - TRANSLATION RULES:
- Respond ONLY in Turkish. Do NOT provide any English translations.
- Never include translations in brackets, parentheses, or any other format.
- If the user doesn't understand, rephrase in simpler Turkish instead of translating.`;
  } else if (options.translationMode === 'always') {
    translationInstructions = `IMPORTANT - TRANSLATION RULES:
- After each Turkish sentence or phrase, provide the English translation on a NEW LINE wrapped in [[ and ]].
- Format example:
  Merhaba! Nasılsınız?
  [[Hello! How are you?]]
  Bugün hava çok güzel.
  [[The weather is very nice today.]]
- ALWAYS use [[ ]] for translations. Be consistent with this format for every Turkish sentence.
- Keep the Turkish and its translation together as a pair.`;
  } else {
    translationInstructions = `IMPORTANT - TRANSLATION RULES:
- Respond primarily in Turkish without translations.
- Only provide an English translation if the user explicitly asks "what does that mean?" or similar.
- When translating (only if asked), put translation on new line wrapped in [[ ]]:
  Turkish sentence
  [[English translation]]`;
  }

  return `You are a Turkish language practice partner helping someone learn Turkish through realistic conversations.

SCENARIO: ${scenario.title}
${scenario.description}

DIFFICULTY LEVEL:
${difficultyInstructions}

CONTEXT:
${scenarioContext}

VOCABULARY FOCUS: ${scenario.vocabularyFocus?.join(', ') || 'general'}
GRAMMAR FOCUS: ${scenario.grammarFocus?.join(', ') || 'general'}

${translationInstructions}

INSTRUCTIONS:
1. Stay in character throughout the conversation
2. Respond in Turkish, matching the ${options.difficulty} level complexity
3. If the user makes errors, gently correct them by using the correct form naturally in your response
4. Keep the conversation flowing naturally within the scenario
5. If the user seems stuck, rephrase your question more simply in Turkish

${responseModeInstructions}

Start the conversation naturally as your character would in this scenario.`;
}

function getScenarioContext(scenario: Scenario): string {
  const contexts: Record<string, string> = {
    restaurant: `You are a friendly waiter at a traditional Turkish restaurant.
                 The menu includes kebabs, mezes, Turkish breakfast items, and traditional desserts.
                 Be helpful in explaining dishes and making recommendations.`,
    shopping: `You are a vendor at a Turkish bazaar or shop owner.
               Engage in friendly bargaining, explain your products, and be enthusiastic about sales.
               Turkish bazaar culture involves friendly negotiation.`,
    travel: `You are a helpful local in Turkey who enjoys helping tourists.
             Give clear directions and share local tips about the area.
             Be patient if they don't understand at first.`,
    healthcare: `You are a pharmacist or doctor's receptionist.
                 Be professional but warm. Ask clarifying questions about symptoms.
                 Explain things clearly and ensure they understand instructions.`,
    work: `You are a hiring manager or colleague in a Turkish company.
           Be professional and friendly. Ask relevant questions about experience and skills.
           The work culture is generally warm but respectful.`,
    social: `You are a friendly Turkish person meeting someone new.
             Show genuine interest in getting to know them.
             Share a bit about yourself and Turkish culture naturally.`,
    custom: scenario.customPrompt || 'Have a natural conversation based on the given context.',
  };

  return contexts[scenario.type] || contexts.social;
}

export async function startConversation(
  scenario: Scenario,
  options: ConversationOptions
): Promise<{ systemPrompt: string; greeting: string; wordBank?: WordBankItem[] }> {
  const systemPrompt = buildSystemPrompt(scenario, options);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Please start the conversation.' },
  ];

  const greeting = await chatCompletion(messages, {
    model: 'gpt-4o-mini',
    temperature: 0.8,
  });

  const { content, wordBank } = parseResponse(greeting);

  return {
    systemPrompt,
    greeting: content,
    wordBank,
  };
}

export interface WordBankItem {
  turkish: string;
  english: string;
}

function parseResponse(response: string): { content: string; wordBank?: WordBankItem[] } {
  const wordBankMatch = response.match(/\[WORD_BANK\](.*?)\[\/WORD_BANK\]/s);

  let wordBank: WordBankItem[] | undefined;
  let content = response;

  if (wordBankMatch) {
    try {
      const parsed = JSON.parse(wordBankMatch[1]);
      wordBank = parsed.words;
      content = response.replace(/\[WORD_BANK\].*?\[\/WORD_BANK\]/s, '').trim();
    } catch {
      // Invalid JSON, just return content as-is
    }
  }

  return { content, wordBank };
}

export async function sendMessage(
  conversationHistory: ConversationMessage[],
  userMessage: string,
  systemPrompt: string,
  onStream?: (chunk: string) => void
): Promise<{ response: string; wordBank?: WordBankItem[]; translation?: string }> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ];

  let fullResponse: string;

  if (onStream) {
    fullResponse = await streamChatCompletion(messages, onStream, {
      model: 'gpt-4o-mini',
      temperature: 0.8,
    });
  } else {
    fullResponse = await chatCompletion(messages, {
      model: 'gpt-4o-mini',
      temperature: 0.8,
    });
  }

  const { content, wordBank } = parseResponse(fullResponse);

  // Extract any inline translation
  const translationMatch = content.match(/\[([^\]]+)\]$/);
  const translation = translationMatch ? translationMatch[1] : undefined;
  const cleanContent = translationMatch
    ? content.replace(/\s*\[[^\]]+\]$/, '').trim()
    : content;

  return {
    response: cleanContent,
    wordBank,
    translation,
  };
}

export async function generateCustomScenario(
  userDescription: string,
  difficulty: DifficultyLevel
): Promise<Scenario> {
  const prompt = `Create a Turkish language learning scenario based on this description:
"${userDescription}"

The difficulty level is ${difficulty}.

Respond with ONLY a JSON object (no markdown code blocks) in this exact format:
{
  "title": "English title",
  "titleTurkish": "Turkish title",
  "description": "Brief description of the scenario",
  "vocabularyFocus": ["word1", "word2", "word3", "word4", "word5"],
  "grammarFocus": ["grammar point 1", "grammar point 2"],
  "customPrompt": "Detailed instructions for the AI conversation partner about their role and the scenario context"
}`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.7 }
  );

  try {
    const parsed = JSON.parse(response);
    return {
      id: `custom-${Date.now()}`,
      type: 'custom',
      title: parsed.title,
      titleTurkish: parsed.titleTurkish,
      description: parsed.description,
      difficulty,
      vocabularyFocus: parsed.vocabularyFocus,
      grammarFocus: parsed.grammarFocus,
      customPrompt: parsed.customPrompt,
      isPreset: false,
    };
  } catch {
    throw new Error('Failed to generate scenario. Please try again.');
  }
}

/**
 * Generate a lesson within a specific category
 */
export async function generateCustomLesson(
  categoryType: string,
  categoryTitle: string,
  userDescription: string,
  difficulty: DifficultyLevel
): Promise<Scenario> {
  const prompt = `Create a Turkish language learning lesson for the "${categoryTitle}" category based on this description:
"${userDescription}"

The difficulty level is ${difficulty}.

Respond with ONLY a JSON object (no markdown code blocks) in this exact format:
{
  "title": "English title for the specific lesson",
  "titleTurkish": "Turkish title",
  "description": "Brief description of what the user will practice in this lesson",
  "vocabularyFocus": ["word1", "word2", "word3", "word4", "word5"],
  "grammarFocus": ["grammar point 1", "grammar point 2"],
  "customPrompt": "Detailed instructions for the AI conversation partner about their role and the scenario context"
}`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.7 }
  );

  try {
    const parsed = JSON.parse(response);
    return {
      id: `lesson-${Date.now()}`,
      type: categoryType,
      title: parsed.title,
      titleTurkish: parsed.titleTurkish,
      description: parsed.description,
      difficulty,
      vocabularyFocus: parsed.vocabularyFocus,
      grammarFocus: parsed.grammarFocus,
      customPrompt: parsed.customPrompt,
      isPreset: false,
    };
  } catch {
    throw new Error('Failed to generate lesson. Please try again.');
  }
}

export interface TranslationResult {
  english: string;
  pronunciation: string;
  exampleSentence: string;
  exampleTranslation: string;
  isPhrase: boolean;
}

// In-memory cache for translations to avoid redundant API calls
const translationCache = new Map<string, TranslationResult>();

/**
 * Get a cached translation if available
 */
export function getCachedTranslation(turkishText: string): TranslationResult | undefined {
  const normalizedKey = turkishText.trim().toLowerCase();
  return translationCache.get(normalizedKey);
}

/**
 * Clear the translation cache (useful for testing or memory management)
 */
export function clearTranslationCache(): void {
  translationCache.clear();
}

/**
 * Get the current cache size
 */
export function getTranslationCacheSize(): number {
  return translationCache.size;
}

export async function getWordTranslation(
  turkishText: string
): Promise<TranslationResult> {
  const normalizedKey = turkishText.trim().toLowerCase();

  // Check cache first
  const cached = translationCache.get(normalizedKey);
  if (cached) {
    return cached;
  }

  const isPhrase = turkishText.trim().includes(' ');

  const prompt = isPhrase
    ? `Translate this Turkish phrase and provide usage info. Respond with ONLY JSON (no code blocks):
Phrase: "${turkishText}"

{
  "english": "English translation of the phrase",
  "pronunciation": "phonetic pronunciation guide for the full phrase",
  "exampleSentence": "Another example sentence in Turkish using this phrase or similar construction",
  "exampleTranslation": "English translation of the example"
}`
    : `Translate this Turkish word and provide usage info. Respond with ONLY JSON (no code blocks):
Word: "${turkishText}"

{
  "english": "English translation",
  "pronunciation": "phonetic pronunciation guide",
  "exampleSentence": "Example sentence in Turkish using the word",
  "exampleTranslation": "English translation of the example"
}`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.3 }
  );

  try {
    const parsed = JSON.parse(response);
    const result: TranslationResult = { ...parsed, isPhrase };
    // Cache the successful translation
    translationCache.set(normalizedKey, result);
    return result;
  } catch {
    // Don't cache failed translations
    return {
      english: 'Translation unavailable',
      pronunciation: '',
      exampleSentence: '',
      exampleTranslation: '',
      isPhrase,
    };
  }
}

export async function evaluateUserResponse(
  userMessage: string,
  conversationContext: string,
  difficulty: DifficultyLevel
): Promise<{ isCorrect: boolean; feedback?: string; correction?: string }> {
  const prompt = `Evaluate this Turkish language learner's response:

Context: ${conversationContext}
User's response: "${userMessage}"
Learner's level: ${difficulty}

Check for:
1. Grammar correctness
2. Appropriate vocabulary usage
3. Natural phrasing

Respond with ONLY JSON:
{
  "isCorrect": true/false,
  "feedback": "Brief encouraging feedback if correct, or explanation of the error",
  "correction": "The corrected version if there were errors, or null if correct"
}`;

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.3 }
  );

  try {
    return JSON.parse(response);
  } catch {
    return { isCorrect: true };
  }
}

export interface AssistSuggestion {
  turkish: string;
  english: string;
  explanation?: string;
}

export interface AssistResponse {
  type: 'suggestions' | 'explanation';
  suggestions?: AssistSuggestion[];
  explanation?: string;
  examples?: AssistSuggestion[];
}

export type AssistMode = 'suggestions' | 'grammar' | 'howto';

export async function getAssistSuggestions(
  conversationHistory: ConversationMessage[],
  difficulty: DifficultyLevel,
  mode: AssistMode = 'suggestions',
  customQuestion?: string
): Promise<AssistResponse> {
  const lastAssistantMessage = [...conversationHistory]
    .reverse()
    .find((m) => m.role === 'assistant');

  const conversationContext = conversationHistory
    .slice(-4)
    .map((m) => `${m.role}: ${m.content}`)
    .join('\n');

  let prompt: string;

  if (mode === 'howto' && customQuestion) {
    // User is asking "How do I say X?"
    prompt = `You are a Turkish language tutor helping a ${difficulty} level learner.

The learner is in a conversation and wants to know how to say something in Turkish.

Recent conversation context:
${conversationContext}

The learner asks: "${customQuestion}"

Provide 2-3 ways to express this in Turkish, appropriate for their ${difficulty} level.
Include variations from formal to casual if applicable.

Respond with ONLY JSON (no code blocks):
{
  "type": "explanation",
  "explanation": "Brief explanation of how to express this concept in Turkish (1-2 sentences)",
  "examples": [
    {
      "turkish": "The Turkish phrase/sentence",
      "english": "English translation",
      "explanation": "When to use this variation (e.g., formal, casual, polite)"
    }
  ]
}`;
  } else if (mode === 'grammar' && customQuestion) {
    // User is asking a grammar question
    prompt = `You are a Turkish language tutor helping a ${difficulty} level learner.

The learner is in a conversation and has a grammar question.

Recent conversation context:
${conversationContext}

The learner asks: "${customQuestion}"

Provide a clear, concise explanation appropriate for their ${difficulty} level.
Include 2-3 example sentences demonstrating the grammar point.

Respond with ONLY JSON (no code blocks):
{
  "type": "explanation",
  "explanation": "Clear explanation of the grammar concept (2-4 sentences, appropriate for ${difficulty} level)",
  "examples": [
    {
      "turkish": "Example sentence in Turkish",
      "english": "English translation",
      "explanation": "How this example demonstrates the grammar point"
    }
  ]
}`;
  } else {
    // Default: provide response suggestions
    prompt = `You are helping a Turkish language learner (${difficulty} level) who is stuck and doesn't know how to respond.

Recent conversation:
${conversationContext}

The learner needs to respond to: "${lastAssistantMessage?.content || 'the conversation'}"

Provide 3 different response suggestions appropriate for their ${difficulty} level.
Each suggestion should be a complete, natural response they could use.

Respond with ONLY JSON (no code blocks):
{
  "type": "suggestions",
  "suggestions": [
    {
      "turkish": "The Turkish response",
      "english": "English translation",
      "explanation": "Brief note on when/why to use this response (optional)"
    }
  ]
}`;
  }

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.7 }
  );

  try {
    const parsed = JSON.parse(response);
    return parsed;
  } catch {
    return { type: 'suggestions', suggestions: [] };
  }
}
