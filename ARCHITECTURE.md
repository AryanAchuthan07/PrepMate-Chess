# PrepMate Chess - Architecture & Technical Design

## System Overview

PrepMate Chess is a full-stack Next.js application with two main features:

1. **Opponent Analysis** - Search and display chess player ratings
2. **Blindfold Training** - Play chess without seeing the board

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (Client)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌───────────────────────────┐   │
│  │ OpponentAnalysis UI  │  │ BlindfoldsTraining UI     │   │
│  │ - Search form        │  │ - Move input              │   │
│  │ - Rating chart       │  │ - Game status             │   │
│  │ - Report display     │  │ - Engine strength slider  │   │
│  └──────────────────────┘  └───────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
           │                              │
           │ HTTP/JSON                    │ HTTP/JSON
           ▼                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Next.js Server (Backend)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌───────────────────────────┐   │
│  │ /api/opponent        │  │ /api/chess               │   │
│  │ - Cache (in-memory)  │  │ - Game state mgmt        │   │
│  │ - Mock data          │  │ - Move validation        │   │
│  │ - Data generation    │  │ - Engine logic           │   │
│  └──────────────────────┘  └───────────────────────────┘   │
│           │                            │                    │
│        chess.js                    chess.js                 │
└─────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

#### 1. OpponentAnalysis Component
**Location**: `components/OpponentAnalysis.tsx`

**Responsibilities**:
- Search form for player ID input
- API call to `/api/opponent`
- Display opponent report
- Render rating history chart using Recharts

**Props**: None (self-contained)

**State**:
```typescript
id: string                    // Search input
opponent: Opponent | null     // Fetched opponent data
loading: boolean              // Loading state
error: string                 // Error message
```

**Key Methods**:
- `handleSearch()` - Validate ID and fetch opponent data
- `getTrendColor()` - Return color based on trend

#### 2. BlindfoldsTraining Component
**Location**: `components/BlindfoldsTraining.tsx`

**Responsibilities**:
- Manage game flow (idle → playing → finished)
- Handle move submission and validation
- Display engine strength slider
- Show move history and feedback

**Props**: None (self-contained)

**State**:
```typescript
engineRating: number          // Selected engine strength
gameState: GameState          // Current game state
move: string                  // Current move input
feedback: string              // Move feedback/status
showBoard: boolean            // Board visibility toggle
```

**Key Methods**:
- `startGame()` - Create new game session
- `submitMove()` - Submit and validate player move
- `resignGame()` - End current game
- `showBoardToggle()` - Reveal board and end blindfold mode

### API Routes

#### 1. POST /api/opponent
**File**: `app/api/opponent/route.ts`

**Purpose**: Fetch or generate chess player rating data

**Request**:
```typescript
{
  id: string  // USCF (7 digits) or FIDE ID (fide_[number])
}
```

**Response**:
```typescript
{
  success: boolean
  opponent: {
    id: string
    name: string
    currentRating: number
    peakRating: number
    peakDate: string
    ratingHistory: { year: number; rating: number }[]
    trend: 'improving' | 'declining' | 'stable'
  }
}
```

**Implementation Details**:
- **Caching**: 1-hour TTL per ID using in-memory Map
- **Mock Data**: Pre-defined dataset for sample IDs
- **Generation**: Random data for unknown IDs (demo)
- **Trend Calculation**: Compares recent vs previous ratings

**Cache Strategy**:
```typescript
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

// Before API call, check cache
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return cached data
}

// After fetch, store in cache
cache.set(id, { data, timestamp: Date.now() })
```

#### 2. POST /api/chess
**File**: `app/api/chess/route.ts`

**Purpose**: Manage chess game state and engine moves

**Actions**:

##### Create Game
```typescript
{
  action: 'create',
  engineRating: number  // 800-3000
}
```

Response:
```typescript
{
  success: true,
  gameId: string,
  fen: string,
  moves: string[],
  status: 'started'
}
```

##### Make Move
```typescript
{
  action: 'move',
  gameId: string,
  move: string  // Algebraic notation: e4, Nf3, exd5, etc.
}
```

Response:
```typescript
{
  success: boolean,
  error?: string,
  userMoveValid: boolean,
  userMove: string,
  engineMove: string,
  status: 'playing' | 'checkmate' | 'draw',
  inCheck: boolean,
  result?: string,
  fen: string,
  moves: string[]
}
```

##### Resign Game
```typescript
{
  action: 'resign',
  gameId: string
}
```

##### Show Board
```typescript
{
  action: 'show-board',
  gameId: string
}
```

**Game State Management**:
```typescript
const activeGames = new Map<
  string,
  {
    chess: any           // chess.js instance
    moves: string[]      // Move history
    engineRating: number // Difficulty
    lastUpdated: number  // For cleanup
  }
>()
```

**Engine Logic**:
- Preference chain: Checkmate → Check → Random
- Difficulty scaling: Higher rating = stronger moves
- Move generation: Sloppy algebraic notation support

## Data Flow Diagrams

### Opponent Analysis Flow

```
User Input ID
     ↓
Search Button Click
     ↓
Check Cache (1 hour TTL)
     ├─ Hit: Return cached data
     └─ Miss:
        ↓
        Fetch /api/opponent {id}
        ↓
        Generate mock data if ID not in database
        ↓
        Cache result
        ↓
        Return to component
        ↓
Display Report + Chart
```

### Blindfold Chess Flow

```
User Adjusts Strength
     ↓
Click "Start Training"
     ↓
POST /api/chess {action: 'create', engineRating}
     ↓
Generate Game ID
Create Chess instance (initial position)
Store in activeGames map
     ↓
Return gameId
     ↓
User Enters Move (e.g., "e4")
     ↓
POST /api/chess {action: 'move', gameId, move}
     ↓
chess.move(move) - validate
     ├─ Invalid: Return error + valid moves list
     └─ Valid:
        ↓
        Check game end (checkmate/draw)
        ├─ Yes: Return result
        └─ No:
           ↓
           Generate engine move
           Execute engine move
           Check game end
           Return to component
           ↓
Update UI with feedback
Display move history
Repeat or end game
```

## Key Libraries & Their Roles

### chess.js
- **Purpose**: Chess move validation and game state management
- **Used in**: `/api/chess` route
- **Key Methods**:
  - `move(move, {sloppy: true})` - Validate and make move
  - `fen()` - Get current position
  - `moves()` - Get legal moves
  - `isCheckmate()` - Check win condition
  - `isDraw()` - Check draw condition

### Recharts
- **Purpose**: Visualize rating history
- **Used in**: OpponentAnalysis component
- **Components**: `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`

### Tailwind CSS
- **Purpose**: Styling and responsive design
- **Configuration**: `tailwind.config.ts`
- **Key Classes**:
  - Grid layout: `grid grid-cols-1 lg:grid-cols-2`
  - Colors: `bg-blue-600`, `text-gray-900`
  - Spacing: `p-6`, `mb-4`, `gap-8`

### Next.js 14
- **Purpose**: Full-stack React framework
- **Features Used**:
  - App Router (`app/` directory)
  - API Routes (`app/api/*`)
  - Server-side rendering
  - Static file serving

## Performance Considerations

### Caching
- **Opponent data**: 1 hour TTL
- **Game sessions**: 30 minutes TTL with auto-cleanup
- **Chart data**: Rendered client-side (no caching needed)

### Code Splitting
- Each component is lazy-loadable
- API routes are serverless functions (no loading overhead)

### Memory Management
- Active games automatically cleaned up
- Opponent cache limited by TTL

## Security Considerations

### Input Validation
- Player ID format validation
- Chess move validation via chess.js
- Error handling for invalid requests

### Rate Limiting
- Not implemented (MVP), could add in production
- Cache prevents repeated API calls

### Data Privacy
- No user authentication (MVP)
- No data persistence
- In-memory storage only

## Error Handling

### Frontend
- Try-catch blocks around API calls
- User-friendly error messages
- Graceful degradation

### Backend
- Input validation before processing
- Error responses with HTTP status codes
- Fallback mock data for unknown IDs

## Testing Strategies

### Unit Tests (Not included - for future)
- chess.js move validation
- Trend calculation algorithm
- Rating category classification

### Integration Tests (Not included - for future)
- API endpoint responses
- Game flow end-to-end
- Cache behavior

### Manual Testing Checklist
- [ ] Search with valid USCF ID
- [ ] Search with valid FIDE ID
- [ ] Search with invalid ID (demo data)
- [ ] Chart renders correctly
- [ ] Start blindfold game
- [ ] Submit valid moves
- [ ] Submit invalid moves
- [ ] Engine generates responses
- [ ] Show board button works
- [ ] Resign game button works

## Future Architecture Improvements

### Database Layer
```typescript
// Add persistent storage
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Cache opponent data in database
// Persist game history for user
```

### Authentication
```typescript
// Add NextAuth.js for user management
import { auth } from '@/auth'
```

### Real Stockfish Integration
```typescript
// Replace simple engine with WASM Stockfish
import StockfishJs from 'stockfish.js/src/stockfish.js'
```

### Websocket Support
```typescript
// Real-time multiplayer games
import { WebSocketServer } from 'ws'
```

## Deployment Considerations

### Vercel (Recommended)
- Automatic deployments from Git
- Serverless functions
- Built-in CDN

### Environment Variables
```
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
OPPONENT_API_KEY=xxx (future)
```

### Build Optimization
```bash
# Analyze bundle size
npm run build -- --analyze
```

## Monitoring & Logging

### Current Implementation
- Console errors and logs (development only)
- No production logging

### Future Enhancements
```typescript
// Add logging library (Winston, Pino)
import logger from '@/lib/logger'

logger.info('Opponent search', { id, result: 'found' })
logger.error('Game creation failed', error)
```

## Conclusion

PrepMate Chess is built with a clean, modular architecture that prioritizes:
- **Simplicity**: In-memory storage, mock data
- **Performance**: Caching, efficient re-renders
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add features and integrations
