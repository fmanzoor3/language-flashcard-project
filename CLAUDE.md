# Claude Code Instructions

## Project Overview
A gamified Turkish language learning web app with four main features:
- **Conversations** - AI-powered Turkish dialogue practice with scenarios
- **Flashcards** - Spaced repetition (SM-2 algorithm) vocabulary review
- **Listening** - Dictation and comprehension exercises with Azure TTS
- **Island Game** - Idle survival game where flashcard performance affects loot/progression

## Tech Stack
- React 18 + TypeScript + Vite
- Zustand for state management
- Tailwind CSS for styling
- IndexedDB (Dexie.js) for local storage
- Azure OpenAI (gpt-4o-mini for cost efficiency, gpt-4o for quality)
- Azure Realtime Audio API for text-to-speech

## Git Workflow
**After completing a feature or fix, commit the changes:**
1. Run `git status` and `git diff` to review changes
2. Create a descriptive commit message summarizing the "why"
3. End commit messages with: `Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>`

## Project Structure
```
src/
├── features/           # Feature modules (conversations, flashcards, game, listening)
│   └── [feature]/
│       └── components/ # React components for the feature
├── services/
│   ├── azure/          # Azure OpenAI and audio services
│   └── storage/        # IndexedDB (db.ts)
├── stores/             # Zustand stores (userStore, flashcardStore, etc.)
├── types/              # TypeScript type definitions (index.ts)
└── App.tsx             # Main app with routing
```

## Key Patterns
- **Stores**: Use Zustand with the `create` pattern, keep in `src/stores/`
- **Types**: Centralized in `src/types/index.ts`
- **Azure Services**: All API calls go through `src/services/azure/`
- **Components**: Feature-specific components in `src/features/[feature]/components/`

## Azure Configuration
- Endpoint: Uses `VITE_AZURE_OPENAI_ENDPOINT` env var
- Models: `gpt-4o-mini` (default), `gpt-4o` (quality), `gpt-4o-mini-realtime-preview` (audio)
- Region: swedencentral

## Coding Preferences
- Prefer editing existing files over creating new ones
- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Keep components focused and reasonably sized
- Use Tailwind classes for styling (dark theme with slate colors)

## Important Files
- `src/types/index.ts` - All shared TypeScript types
- `src/services/storage/db.ts` - IndexedDB schema
- `src/stores/userStore.ts` - User progress, XP, streaks
- `src/stores/flashcardStore.ts` - Flashcard deck and SM-2 logic
- `.env` - Azure API keys (never commit real keys)
