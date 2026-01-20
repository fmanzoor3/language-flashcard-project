/**
 * Assessment Service
 * Evaluates user performance in Turkish conversations
 */

import { chatCompletion } from './openaiClient';
import type {
  ConversationMessage,
  DifficultyLevel,
  ConversationAssessment,
} from '../../types';
import { SCORE_WEIGHTS, MASTERY_THRESHOLDS } from '../../types';

const ASSESSMENT_PROMPT = `You are a Turkish language assessment expert. Analyze the student's responses in this conversation and provide detailed feedback.

CONVERSATION (user messages are from the learner):
{conversation}

DIFFICULTY LEVEL: {difficulty}

SCORING WEIGHTS for {difficulty}:
- Grammar: {grammarWeight}%
- Vocabulary: {vocabWeight}%
- Appropriateness: {appropriatenessWeight}%

MASTERY THRESHOLD: {masteryThreshold}% (without using assist)
USED ASSIST: {usedAssist}

Evaluate ALL user messages for:
1. Grammar: Correct Turkish grammar, verb conjugations, case endings, word order
2. Vocabulary: Appropriate word choice, range of vocabulary used, natural expressions
3. Appropriateness: Context-appropriate responses, cultural awareness, formality level

Provide your assessment as JSON only (no markdown code blocks):
{
  "overallScore": <number 0-100>,
  "breakdown": {
    "grammar": <number 0-100>,
    "vocabulary": <number 0-100>,
    "appropriateness": <number 0-100>
  },
  "issues": [
    {
      "messageId": "<id of the user message with the issue>",
      "category": "grammar" | "spelling" | "vocabulary" | "phrasing" | "appropriateness",
      "severity": "minor" | "moderate" | "major",
      "originalText": "<the problematic text>",
      "correctedText": "<the corrected version>",
      "explanation": "<brief explanation in English>"
    }
  ],
  "vocabularySuggestions": [
    {
      "turkish": "<Turkish word/phrase>",
      "english": "<English translation>",
      "reason": "struggled" | "new_vocabulary" | "important_phrase",
      "pronunciation": "<pronunciation guide>",
      "exampleSentence": "<example usage>"
    }
  ],
  "feedbackSummary": "<2-3 sentences of encouraging feedback highlighting what they did well>",
  "improvementTips": [
    "<specific actionable tip 1>",
    "<specific actionable tip 2>",
    "<specific actionable tip 3>"
  ]
}

IMPORTANT:
- Be encouraging but honest
- Focus on patterns, not individual minor mistakes
- Include 3-6 vocabulary suggestions (words they used incorrectly, struggled with, or should learn)
- The overallScore should be calculated using the weighted breakdown scores
- If they used assist, note that it prevents mastery but don't be harsh about it
- Issues should reference actual mistakes from their messages`;

export interface AssessConversationParams {
  messages: ConversationMessage[];
  difficulty: DifficultyLevel;
  usedAssist: boolean;
  conversationId: string;
}

export async function assessConversation(
  params: AssessConversationParams
): Promise<ConversationAssessment> {
  const { messages, difficulty, usedAssist, conversationId } = params;

  // Format conversation for the prompt
  const conversationText = messages
    .filter((m) => m.role !== 'system')
    .map((m) => `[${m.id}] ${m.role.toUpperCase()}: ${m.content}`)
    .join('\n\n');

  const weights = SCORE_WEIGHTS[difficulty];
  const threshold = MASTERY_THRESHOLDS[difficulty];

  const prompt = ASSESSMENT_PROMPT
    .replace('{conversation}', conversationText)
    .replace(/{difficulty}/g, difficulty)
    .replace('{grammarWeight}', String(weights.grammar))
    .replace('{vocabWeight}', String(weights.vocabulary))
    .replace('{appropriatenessWeight}', String(weights.appropriateness))
    .replace('{masteryThreshold}', String(threshold))
    .replace('{usedAssist}', usedAssist ? 'Yes' : 'No');

  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    { model: 'gpt-4o-mini', temperature: 0.3 }
  );

  try {
    const parsed = JSON.parse(response);

    // Calculate weighted overall score
    const weightedScore = Math.round(
      (parsed.breakdown.grammar * weights.grammar +
        parsed.breakdown.vocabulary * weights.vocabulary +
        parsed.breakdown.appropriateness * weights.appropriateness) /
        100
    );

    // Determine mastery - must meet threshold AND not have used assist
    const isMastered = !usedAssist && weightedScore >= threshold;

    return {
      id: `assessment-${Date.now()}`,
      conversationId,
      overallScore: weightedScore,
      isMastered,
      breakdown: parsed.breakdown,
      issues: parsed.issues || [],
      vocabularySuggestions: parsed.vocabularySuggestions || [],
      feedbackSummary: parsed.feedbackSummary || 'Good effort!',
      improvementTips: parsed.improvementTips || [],
      difficulty,
      usedAssist,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Failed to parse assessment response:', error);
    // Return a default assessment on parse failure
    return {
      id: `assessment-${Date.now()}`,
      conversationId,
      overallScore: 50,
      isMastered: false,
      breakdown: { grammar: 50, vocabulary: 50, appropriateness: 50 },
      issues: [],
      vocabularySuggestions: [],
      feedbackSummary: 'Unable to fully assess the conversation. Keep practicing!',
      improvementTips: ['Continue practicing Turkish conversations'],
      difficulty,
      usedAssist,
      createdAt: new Date(),
    };
  }
}

export function calculateXPFromAssessment(assessment: ConversationAssessment): number {
  let xp = 25; // Base XP for completing

  // Bonus XP based on score (5 XP per 10%)
  xp += Math.floor(assessment.overallScore / 10) * 5;

  // Mastery bonus
  if (assessment.isMastered) {
    xp += 25;
  }

  // Assist penalty
  if (assessment.usedAssist) {
    xp -= 10;
  }

  return Math.max(xp, 10); // Minimum 10 XP
}
