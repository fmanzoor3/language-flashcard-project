import { useState } from 'react';

const PRESET_SCENARIOS = [
  {
    id: 'restaurant',
    title: 'At a Restaurant',
    titleTurkish: 'Restoranda',
    emoji: '🍽️',
    description: 'Practice ordering food, asking about the menu, and paying the bill',
    difficulty: 'A1',
  },
  {
    id: 'shopping',
    title: 'Shopping at the Bazaar',
    titleTurkish: 'Çarşıda Alışveriş',
    emoji: '🛍️',
    description: 'Learn to bargain, ask about prices, and make purchases',
    difficulty: 'A2',
  },
  {
    id: 'travel',
    title: 'Getting Around',
    titleTurkish: 'Yol Tarifi',
    emoji: '🚌',
    description: 'Ask for directions, use public transport, and find your way',
    difficulty: 'A1',
  },
  {
    id: 'social',
    title: 'Making Friends',
    titleTurkish: 'Arkadaşlık',
    emoji: '👋',
    description: 'Introduce yourself, make small talk, and build relationships',
    difficulty: 'A1',
  },
  {
    id: 'work',
    title: 'At the Office',
    titleTurkish: 'Ofiste',
    emoji: '💼',
    description: 'Professional conversations, meetings, and workplace interactions',
    difficulty: 'B1',
  },
  {
    id: 'healthcare',
    title: 'At the Doctor',
    titleTurkish: 'Doktorda',
    emoji: '🏥',
    description: 'Describe symptoms, understand prescriptions, and book appointments',
    difficulty: 'A2',
  },
];

export default function ConversationsPage() {
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Conversation Practice</h2>
          <p className="text-slate-400">
            Choose a scenario to practice real-world Turkish conversations
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚧</span>
            <div>
              <p className="font-medium text-amber-400">Coming Soon!</p>
              <p className="text-sm text-slate-400">
                AI-powered conversations with Azure OpenAI are being implemented.
                For now, explore the available scenarios.
              </p>
            </div>
          </div>
        </div>

        {/* Scenario Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {PRESET_SCENARIOS.map((scenario) => (
            <button
              key={scenario.id}
              onClick={() => setSelectedScenario(scenario.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                selectedScenario === scenario.id
                  ? 'bg-emerald-500/10 border-emerald-500/50'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{scenario.emoji}</span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold">{scenario.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        scenario.difficulty === 'A1'
                          ? 'bg-green-500/20 text-green-400'
                          : scenario.difficulty === 'A2'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-purple-500/20 text-purple-400'
                      }`}
                    >
                      {scenario.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    {scenario.titleTurkish}
                  </p>
                  <p className="text-sm text-slate-500 mt-2">
                    {scenario.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Custom Scenario */}
        <div className="mt-6 p-4 rounded-xl border border-dashed border-slate-600 bg-slate-800/30">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✨</span>
            <div className="flex-1">
              <h3 className="font-bold">Create Custom Scenario</h3>
              <p className="text-sm text-slate-400 mt-1">
                Describe any situation and AI will generate a conversation for you
              </p>
            </div>
            <button
              disabled
              className="bg-slate-700 text-slate-400 px-4 py-2 rounded-lg text-sm cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>

        {/* Selected Scenario Preview */}
        {selectedScenario && (
          <div className="mt-6 p-6 rounded-xl bg-slate-800 border border-slate-700">
            <h3 className="font-bold text-lg mb-4">
              {PRESET_SCENARIOS.find((s) => s.id === selectedScenario)?.title}
            </h3>

            {/* Sample Conversation Preview */}
            <div className="space-y-3 mb-6">
              <div className="flex gap-3">
                <span className="text-xl">🤖</span>
                <div className="bg-slate-700 rounded-lg px-4 py-2 max-w-[80%]">
                  <p className="text-sm">Hoş geldiniz! Kaç kişisiniz?</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Welcome! How many people are you?
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-4 py-2 max-w-[80%]">
                  <p className="text-sm">İki kişiyiz. Pencere kenarında bir masa var mı?</p>
                  <p className="text-xs text-slate-400 mt-1">
                    We are two. Is there a table by the window?
                  </p>
                </div>
                <span className="text-xl">👤</span>
              </div>
            </div>

            <button
              disabled
              className="w-full bg-emerald-500/50 text-white font-medium py-3 rounded-lg cursor-not-allowed"
            >
              Start Conversation (Coming Soon)
            </button>
          </div>
        )}

        {/* Quick Vocabulary Section */}
        <div className="mt-8">
          <h3 className="font-bold text-lg mb-4">Quick Vocabulary</h3>
          <p className="text-sm text-slate-400 mb-4">
            Common phrases you'll learn in conversations. Tap to add to flashcards!
          </p>

          <div className="grid gap-2 md:grid-cols-2">
            {[
              { turkish: 'Merhaba', english: 'Hello' },
              { turkish: 'Teşekkür ederim', english: 'Thank you' },
              { turkish: 'Lütfen', english: 'Please' },
              { turkish: 'Evet / Hayır', english: 'Yes / No' },
              { turkish: 'Ne kadar?', english: 'How much?' },
              { turkish: 'Hesap lütfen', english: 'The bill please' },
              { turkish: 'Anlıyorum', english: 'I understand' },
              { turkish: 'Anlamıyorum', english: "I don't understand" },
            ].map((phrase) => (
              <div
                key={phrase.turkish}
                className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="font-medium">{phrase.turkish}</p>
                  <p className="text-sm text-slate-400">{phrase.english}</p>
                </div>
                <span className="text-slate-500 hover:text-emerald-400">+</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
