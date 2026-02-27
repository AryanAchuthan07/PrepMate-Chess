# PrepMate Chess - AI Agent Guidelines

## Project Overview
PrepMate Chess is a Next.js 14 app for chess players combining opponent analysis (rating lookup via USCF/FIDE IDs) and blindfold training (play chess without seeing the board). Built with TypeScript, Tailwind CSS, chess.js, and Recharts.

## Architecture Essentials

### Two-Feature System
1. **Opponent Analysis** ([components/OpponentAnalysis.tsx](../components/OpponentAnalysis.tsx))
   - POST to `/api/opponent` with player ID → cached rating history + trend analysis
   - Mock data database in [app/api/opponent/route.ts](../app/api/opponent/route.ts) (lines 5-54)
   - In-memory cache with 1-hour TTL (Map-based, line 56-57)

2. **Blindfold Training** ([components/BlindfoldsTraining.tsx](../components/BlindfoldsTraining.tsx))
   - POST to `/api/chess` for game lifecycle: `create`, `move`, `resign`, `show-board`
   - Server maintains game state in `activeGames` Map ([app/api/chess/route.ts](../app/api/chess/route.ts), line 5)
   - 30-minute game timeout with cleanup interval (lines 14-22)

### Client-Server Pattern
- All UI in `'use client'` components (Next.js App Router requirement)
- API routes handle stateful logic (chess.js instances, caching)
- Tab-based navigation in [app/page.tsx](../app/page.tsx) using simple state toggle

## Critical Implementation Details

### Move Normalization (Chess API)
The chess API accepts "sloppy" algebraic notation via custom normalization:
```typescript
// app/api/chess/route.ts line 60-72
const normalizeSAN = (m: string) => {
  // Handles: lowercase pieces, O-O variations, promotion format
  // Returns chess.js-compatible SAN
}
```
Always call `chess.move(normalizedMove, { sloppy: true })` to support flexible input.

### Opponent Utils Parsing ([lib/opponent-utils.js](../lib/opponent-utils.js))
JavaScript file (not TS) exporting FIDE HTML parsers:
- `parseFideJSRatingHistory()` - extracts JS chart data from FIDE pages (line 2-65)
- `parseFideTableHistory()` - parses HTML tables (line 68-103)
- `normalizeHistory()` / `derivePeakFromHistory()` - data normalization helpers

**Pattern**: Try JS parsing first, fallback to table parsing, then use mock generation if both fail.

### Visual Board Path Highlighting
[components/BlindfoldsTraining.tsx](../components/BlindfoldsTraining.tsx) (lines 44-95) computes traveled squares for piece moves:
- Knights show only start/end
- Sliding pieces show full path
- Pawn double-pushes include intermediate square
Used by [components/VisualBoard.tsx](../components/VisualBoard.tsx) to highlight recent moves.

## Development Workflows

### Running & Testing
```bash
npm run dev          # Development server (Next.js port 3000)
npm run build        # Production build
npm run test         # Run tests/opponent-utils.test.js (vanilla Node.js)
```

**Note**: Test file uses `assert` module and `console.log` for output (no test framework).

### API Testing
Use demo IDs documented in [API_TESTING.md](../API_TESTING.md):
- `1234567` - John Doe (USCF, rating 1825)
- `fide_2000000` - Grandmaster Alex (FIDE, rating 2650)

### Debugging Chess Games
Enable debug mode: POST `/api/chess` with `{ debug: true }` to get verbose logging (check [app/api/chess/route.ts](../app/api/chess/route.ts) for debug flags).

## Project-Specific Conventions

### File Organization
- **Client Components**: `components/*.tsx` (all use `'use client'`)
- **API Routes**: `app/api/*/route.ts` (Next.js convention)
- **Utilities**: `lib/*.{ts,js}` (mixed TS/JS - opponent-utils is JS for legacy reasons)
- **Config**: Root-level (next.config.js, tailwind.config.ts, tsconfig.json)

### TypeScript Patterns
- Interfaces defined inline at component top (no separate types/ folder)
- Type safety enforced except opponent-utils.js (imports use `@ts-ignore` if needed)
- chess.js uses `any` type for game instances (library limitation)

### Styling Approach
- Tailwind utility classes only (no CSS modules or styled-components)
- Color scheme: green-600 for primary actions, red-600 for errors, gray for neutrals
- Responsive design: `max-w-5xl mx-auto` containers, mobile-first breakpoints

### State Management
- Local `useState` only (no Redux/Zustand/Context)
- Server state lives in Maps within API routes (not persisted to disk)
- Cache invalidation: TTL-based (no manual cache busting)

## Common Pitfalls

1. **Don't persist game state** - It's intentionally ephemeral (Map-based, resets on server restart)
2. **chess.js move errors** - Always wrap `chess.move()` in try-catch (throws on invalid moves)
3. **Opponent ID format** - FIDE IDs must start with `fide_` prefix (e.g., `fide_2000000`)
4. **Client components** - All UI files need `'use client'` directive (Next.js 14 App Router default is server)

## Extension Points

- Add external API integration at [app/api/opponent/route.ts](../app/api/opponent/route.ts) line 92 (`fetched` variable placeholder)
- Replace engine logic at [app/api/chess/route.ts](../app/api/chess/route.ts) lines 116-140 (currently random-based with checkmate preference)
- Extend opponent-utils parsers for new FIDE page formats in [lib/opponent-utils.js](../lib/opponent-utils.js)

## Documentation Index
Refer to root-level MD files for deeper context:
- [ARCHITECTURE.md](../ARCHITECTURE.md) - Full system design with diagrams
- [SETUP.md](../SETUP.md) - Installation and deployment guide
- [API_TESTING.md](../API_TESTING.md) - cURL/Postman examples
- [BUILD_COMPLETE.md](../BUILD_COMPLETE.md) - Project completion summary
