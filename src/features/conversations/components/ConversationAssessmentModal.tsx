import { useState } from 'react';
import { useConversationStore } from '../../../stores/conversationStore';
import type { ConversationAssessment, VocabularySuggestion, ConversationIssue } from '../../../types';
import { SCORE_WEIGHTS } from '../../../types';

const SCORE_COLORS = {
  excellent: 'text-emerald-400',
  good: 'text-blue-400',
  fair: 'text-yellow-400',
  needsWork: 'text-orange-400',
};

function getScoreColor(score: number): string {
  if (score >= 80) return SCORE_COLORS.excellent;
  if (score >= 70) return SCORE_COLORS.good;
  if (score >= 50) return SCORE_COLORS.fair;
  return SCORE_COLORS.needsWork;
}

function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent!';
  if (score >= 80) return 'Great job!';
  if (score >= 70) return 'Good work!';
  if (score >= 50) return 'Keep practicing!';
  return 'Room for improvement';
}

interface ScoreBarProps {
  label: string;
  score: number;
  weight: number;
}

function ScoreBar({ label, score, weight }: ScoreBarProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className={getScoreColor(score)}>{score}%</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-xs text-slate-500">Weight: {weight}%</div>
    </div>
  );
}

interface IssueCategoryBadgeProps {
  category: ConversationIssue['category'];
  severity: ConversationIssue['severity'];
}

function IssueCategoryBadge({ category, severity }: IssueCategoryBadgeProps) {
  const categoryColors: Record<string, string> = {
    grammar: 'bg-red-500/20 text-red-400',
    spelling: 'bg-orange-500/20 text-orange-400',
    vocabulary: 'bg-blue-500/20 text-blue-400',
    phrasing: 'bg-purple-500/20 text-purple-400',
    appropriateness: 'bg-yellow-500/20 text-yellow-400',
  };

  const severityIndicator = severity === 'major' ? '!' : severity === 'moderate' ? '*' : '';

  return (
    <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[category] || 'bg-slate-500/20 text-slate-400'}`}>
      {category}{severityIndicator}
    </span>
  );
}

interface VocabItemProps {
  suggestion: VocabularySuggestion;
  isAdded: boolean;
  onAdd: () => void;
}

function VocabItem({ suggestion, isAdded, onAdd }: VocabItemProps) {
  const reasonLabels: Record<string, string> = {
    struggled: 'Practice needed',
    new_vocabulary: 'New word',
    important_phrase: 'Useful phrase',
  };

  return (
    <div className="flex items-start justify-between p-3 bg-slate-800/50 rounded-lg">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-100">{suggestion.turkish}</span>
          <span className="text-xs text-slate-500 bg-slate-700/50 px-1.5 py-0.5 rounded">
            {reasonLabels[suggestion.reason] || suggestion.reason}
          </span>
        </div>
        <p className="text-sm text-slate-400 mt-1">{suggestion.english}</p>
        {suggestion.pronunciation && (
          <p className="text-xs text-slate-500 mt-1">/{suggestion.pronunciation}/</p>
        )}
      </div>
      <button
        onClick={onAdd}
        disabled={isAdded}
        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
          isAdded
            ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
            : 'bg-emerald-600 text-white hover:bg-emerald-500'
        }`}
      >
        {isAdded ? 'Added' : '+ Add'}
      </button>
    </div>
  );
}

export default function ConversationAssessmentModal() {
  const {
    currentAssessment,
    showAssessmentModal,
    isLoading,
    closeAssessmentModal,
    addVocabSuggestionToFlashcards,
  } = useConversationStore();

  const [expandedIssues, setExpandedIssues] = useState(false);
  const [addedVocab, setAddedVocab] = useState<Set<string>>(new Set());

  if (!showAssessmentModal || !currentAssessment) {
    return null;
  }

  const assessment = currentAssessment as ConversationAssessment;
  const weights = SCORE_WEIGHTS[assessment.difficulty];

  const handleAddVocab = async (suggestion: VocabularySuggestion) => {
    if (addedVocab.has(suggestion.turkish)) return;
    await addVocabSuggestionToFlashcards(suggestion);
    setAddedVocab((prev) => new Set([...prev, suggestion.turkish]));
  };

  const handleAddAllVocab = async () => {
    for (const suggestion of assessment.vocabularySuggestions) {
      if (!addedVocab.has(suggestion.turkish)) {
        await addVocabSuggestionToFlashcards(suggestion);
        setAddedVocab((prev) => new Set([...prev, suggestion.turkish]));
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-slate-700">
        {/* Header */}
        <div className="p-6 border-b border-slate-700">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-100 mb-2">Conversation Complete</h2>
            <div className="flex items-center justify-center gap-4">
              <div className={`text-5xl font-bold ${getScoreColor(assessment.overallScore)}`}>
                {assessment.overallScore}%
              </div>
              <div className="text-left">
                <p className={`text-lg font-medium ${getScoreColor(assessment.overallScore)}`}>
                  {getScoreLabel(assessment.overallScore)}
                </p>
                {assessment.isMastered ? (
                  <p className="text-emerald-400 text-sm flex items-center gap-1">
                    <span>Level Mastered</span>
                  </p>
                ) : assessment.usedAssist ? (
                  <p className="text-yellow-400 text-sm">Assist used - mastery not counted</p>
                ) : (
                  <p className="text-slate-400 text-sm">
                    Need {assessment.difficulty === 'A1' || assessment.difficulty === 'A2' ? '70' : assessment.difficulty === 'B1' || assessment.difficulty === 'B2' ? '75' : '80'}%+ to master
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Score Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-slate-100 mb-3">Score Breakdown</h3>
            <div className="space-y-4">
              <ScoreBar label="Grammar" score={assessment.breakdown.grammar} weight={weights.grammar} />
              <ScoreBar label="Vocabulary" score={assessment.breakdown.vocabulary} weight={weights.vocabulary} />
              <ScoreBar label="Appropriateness" score={assessment.breakdown.appropriateness} weight={weights.appropriateness} />
            </div>
          </div>

          {/* Feedback Summary */}
          <div>
            <h3 className="text-lg font-semibold text-slate-100 mb-2">Feedback</h3>
            <p className="text-slate-300 bg-slate-800/50 rounded-lg p-4">{assessment.feedbackSummary}</p>
          </div>

          {/* Issues */}
          {assessment.issues.length > 0 && (
            <div>
              <button
                onClick={() => setExpandedIssues(!expandedIssues)}
                className="flex items-center justify-between w-full text-lg font-semibold text-slate-100 mb-2"
              >
                <span>Corrections ({assessment.issues.length})</span>
                <span className="text-slate-400 text-sm">{expandedIssues ? 'Hide' : 'Show'}</span>
              </button>
              {expandedIssues && (
                <div className="space-y-3">
                  {assessment.issues.map((issue, index) => (
                    <div key={index} className="bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <IssueCategoryBadge category={issue.category} severity={issue.severity} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-red-400/80 line-through text-sm">{issue.originalText}</p>
                        <p className="text-emerald-400 text-sm">{issue.correctedText}</p>
                      </div>
                      <p className="text-slate-400 text-sm mt-2">{issue.explanation}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Improvement Tips */}
          {assessment.improvementTips.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-100 mb-2">Tips for Improvement</h3>
              <ul className="space-y-2">
                {assessment.improvementTips.map((tip, index) => (
                  <li key={index} className="flex items-start gap-2 text-slate-300">
                    <span className="text-emerald-400 mt-1">-</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vocabulary Suggestions */}
          {assessment.vocabularySuggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-100">Suggested Vocabulary</h3>
                {assessment.vocabularySuggestions.length > 1 && (
                  <button
                    onClick={handleAddAllVocab}
                    disabled={isLoading || addedVocab.size === assessment.vocabularySuggestions.length}
                    className="text-sm text-emerald-400 hover:text-emerald-300 disabled:text-slate-500"
                  >
                    Add all to flashcards
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {assessment.vocabularySuggestions.map((suggestion, index) => (
                  <VocabItem
                    key={index}
                    suggestion={suggestion}
                    isAdded={addedVocab.has(suggestion.turkish)}
                    onAdd={() => handleAddVocab(suggestion)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 flex justify-end gap-3">
          <button
            onClick={closeAssessmentModal}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
