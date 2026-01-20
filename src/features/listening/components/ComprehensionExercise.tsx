import { useState, useEffect } from 'react';
import { useListeningStore } from '../../../stores/listeningStore';
import VocabularyQuickAdd from './VocabularyQuickAdd';
import type { ListeningExercise, ExerciseProgress } from '../../../types';

interface ComprehensionExerciseProps {
  exercise: ListeningExercise;
  progress?: ExerciseProgress | null;
  onComplete: () => void;
  isLast: boolean;
}

export default function ComprehensionExercise({
  exercise,
  onComplete,
  isLast,
}: ComprehensionExerciseProps) {
  const { submitComprehensionAnswer } = useListeningStore();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { answer: string; correct: boolean; xpEarned: number }>>({});
  const [showTranslation, setShowTranslation] = useState(false);
  const [showPassageTranslation, setShowPassageTranslation] = useState(false);
  const [addedWords, setAddedWords] = useState<Set<string>>(new Set());
  const [showVocabSection, setShowVocabSection] = useState(false);

  const questions = exercise.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const allAnswered = Object.keys(answers).length === totalQuestions;
  const totalXP = Object.values(answers).reduce((sum, a) => sum + a.xpEarned, 0);
  const correctCount = Object.values(answers).filter((a) => a.correct).length;

  // Reset when exercise changes
  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowTranslation(false);
    setShowPassageTranslation(false);
  }, [exercise.id]);

  const handleAnswer = async (questionId: string, answer: string) => {
    if (answers[questionId]) return; // Already answered

    const result = await submitComprehensionAnswer(questionId, answer);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { answer, correct: result.correct, xpEarned: result.xpEarned },
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowTranslation(false);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setShowTranslation(false);
    }
  };

  if (!currentQuestion) {
    return null;
  }

  const currentAnswer = answers[currentQuestion.id];
  const isLastQuestion = currentQuestionIndex === totalQuestions - 1;

  return (
    <div className="space-y-6">
      {/* Exercise Type Badge */}
      <div className="flex items-center gap-2">
        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
          Comprehension
        </span>
        <span className="text-slate-400 text-sm">
          Listen and answer questions
        </span>
      </div>

      {/* Passage Display */}
      <div className="bg-slate-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-300">Passage</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowVocabSection(!showVocabSection)}
              className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              {showVocabSection ? 'Hide' : 'Save'} vocabulary
            </button>
            <button
              onClick={() => setShowPassageTranslation(!showPassageTranslation)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassageTranslation ? 'Hide' : 'Show'} translation
            </button>
          </div>
        </div>
        <p className="text-slate-100 leading-relaxed">{exercise.audioText}</p>
        {showPassageTranslation && (
          <p className="text-sm text-slate-400 mt-3 italic border-t border-slate-700 pt-3">
            {exercise.audioTextTranslation}
          </p>
        )}

        {/* Vocabulary Quick Add Section */}
        {showVocabSection && (
          <div className="mt-3 pt-3 border-t border-slate-700">
            <VocabularyQuickAdd
              text={exercise.audioText}
              translation={exercise.audioTextTranslation}
              addedWords={addedWords}
              onWordAdded={(word) => setAddedWords((prev) => new Set(prev).add(word))}
              className="text-slate-200"
            />
          </div>
        )}
      </div>

      {/* Question Progress */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-400">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
        <div className="flex-1 flex gap-1">
          {questions.map((q, idx) => {
            const ans = answers[q.id];
            let bgColor = 'bg-slate-700';
            if (ans?.correct) bgColor = 'bg-emerald-500';
            else if (ans && !ans.correct) bgColor = 'bg-red-500';
            else if (idx === currentQuestionIndex) bgColor = 'bg-slate-500';

            return (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`flex-1 h-2 rounded ${bgColor} transition-colors hover:opacity-80`}
              />
            );
          })}
        </div>
      </div>

      {/* Current Question */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="mb-4">
          <p className="text-slate-100 font-medium mb-1">{currentQuestion.questionText}</p>
          <button
            onClick={() => setShowTranslation(!showTranslation)}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            {showTranslation ? 'Hide' : 'Show'} translation
          </button>
          {showTranslation && (
            <p className="text-sm text-slate-400 mt-1 italic">{currentQuestion.questionTranslation}</p>
          )}
        </div>

        {/* Answer Options */}
        <div className="space-y-2">
          {currentQuestion.options?.map((option) => {
            const isSelected = currentAnswer?.answer === option;
            const isCorrect = option === currentQuestion.correctAnswer;
            const showResult = !!currentAnswer;

            let optionStyle = 'bg-slate-700 border-slate-600 hover:border-slate-500';
            if (showResult) {
              if (isCorrect) {
                optionStyle = 'bg-emerald-500/20 border-emerald-500';
              } else if (isSelected && !isCorrect) {
                optionStyle = 'bg-red-500/20 border-red-500';
              } else {
                optionStyle = 'bg-slate-700 border-slate-600 opacity-60';
              }
            }

            return (
              <button
                key={option}
                onClick={() => handleAnswer(currentQuestion.id, option)}
                disabled={!!currentAnswer}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${optionStyle} disabled:cursor-not-allowed`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-slate-100">{option}</span>
                  {showResult && isCorrect && <span className="text-emerald-400">✓</span>}
                  {showResult && isSelected && !isCorrect && <span className="text-red-400">✗</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {currentAnswer && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{currentAnswer.correct ? '✅' : '❌'}</span>
              <span className={currentAnswer.correct ? 'text-emerald-400' : 'text-red-400'}>
                {currentAnswer.correct ? 'Correct!' : 'Incorrect'}
              </span>
              {currentAnswer.xpEarned > 0 && (
                <span className="ml-auto text-sm text-emerald-400">+{currentAnswer.xpEarned} XP</span>
              )}
            </div>
            {currentQuestion.explanation && (
              <p className="text-sm text-slate-400">{currentQuestion.explanation}</p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
          className="px-4 py-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        <div className="text-sm">
          {allAnswered && (
            <span className="text-emerald-400">
              {correctCount}/{totalQuestions} correct • +{totalXP} XP
            </span>
          )}
        </div>

        {isLastQuestion && currentAnswer ? (
          <button
            onClick={onComplete}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
          >
            {isLast ? 'Finish' : 'Continue'} →
          </button>
        ) : (
          <button
            onClick={handleNextQuestion}
            disabled={!currentAnswer || isLastQuestion}
            className="px-4 py-2 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
