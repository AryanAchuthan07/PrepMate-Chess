# PrepMate Chess

An interactive web application for competitive chess players to prepare for opponents and train visualization skills through blindfold chess training.

## Features

### 1. Opponent Analysis
- Search players by USCF ID or FIDE ID
- View detailed opponent reports including:
  - Current and peak ratings
  - Rating history visualized as a line chart
  - Trend analysis (improving/declining/stable)
- Results are cached to avoid repeated API calls

### 2. Blindfold Chess Training
- Play against a chess engine without seeing the board
- Input moves using algebraic notation (e.g., Nf3, exd5)
- Adjust engine strength from 800 to 3000 rating
- Real-time move validation and feedback
- "Show Board" option to end blindfold mode
- Complete move history tracking

## Project Structure

```
PrepMate-Chess/
├── app/
│   ├── api/
│   │   ├── opponent/route.ts    # Opponent data API
│   │   └── chess/route.ts       # Chess game API
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main dashboard
│   └── globals.css              # Global styles
├── components/
│   ├── OpponentAnalysis.tsx     # Opponent search component
│   └── BlindfoldsTraining.tsx   # Chess training component
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── README.md
```

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Chess Logic**: chess.js
- **Backend**: Next.js API Routes

## Setup & Installation

### Prerequisites
- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Opponent Analysis
1. Enter a USCF ID (e.g., `1234567`) or FIDE ID (e.g., `fide_2000000`)
2. Click "Search" to fetch opponent data
3. View the report with rating history and trend analysis
4. Results are cached for 1 hour

**Demo IDs to try:**
- `1234567` - John Doe (USCF)
- `9876543` - Jane Smith (USCF)
- `fide_2000000` - Grandmaster Alex (FIDE)

### Blindfold Chess Training
1. Adjust the engine strength using the slider (800-3000 rating)
2. Click "Start Training" to begin
3. Enter moves in algebraic notation (e.g., e4, Nf3, exd5)
4. Receive feedback on move validity and game status
5. Use "Resign Game" to forfeit or "Show Board" to end blindfold mode
6. Review move history after the game ends

## API Endpoints

### POST /api/opponent
Fetch opponent rating data

**Request:**
```json
{ "id": "1234567" }
```

**Response:**
```json
{
  "success": true,
  "opponent": {
    "id": "1234567",
    "name": "John Doe",
    "currentRating": 1825,
    "peakRating": 1970,
    "peakDate": "July 2021",
    "ratingHistory": [...],
    "trend": "improving"
  }
}
```

### POST /api/chess
Manage chess game state and moves

**Actions:**
- `create` - Start a new game
- `move` - Submit a player move
- `resign` - Resign the game
- `show-board` - End blindfold mode

**Create Request:**
```json
{ "action": "create", "engineRating": 1600 }
```

**Move Request:**
```json
{ "action": "move", "gameId": "...", "move": "e4" }
```

## Architecture

### Data Flow

1. **Opponent Analysis**:
   - User inputs ID → API fetches/generates data → Cache stores result → UI renders report with chart

2. **Blindfold Chess**:
   - User starts game → API creates game state → User submits move → API validates & generates engine move → UI updates feedback

### Caching Strategy
- Opponent data: 1-hour TTL per ID
- Game sessions: 30-minute TTL, auto-cleanup every 5 minutes

## Key Implementation Details

### Move Validation
- Uses chess.js for legal move validation
- Supports algebraic notation with leniency (`sloppy: true`)

### Engine Behavior
- Difficulty scales with rating (higher ratings = stronger moves)
- Engine prioritizes checkmate, then checks
- Lower ratings occasionally make suboptimal moves

### Error Handling
- Invalid moves return list of valid alternatives
- Network errors provide user-friendly feedback
- Game state persists on move validation failure

## Future Enhancements

- [ ] Real Stockfish integration (WASM)
- [ ] User authentication and game history
- [ ] Openings database and analysis
- [ ] Multi-player support
- [ ] ELO rating system
- [ ] Puzzle training mode
- [ ] Real USCF/FIDE API integration
- [ ] Mobile-optimized responsive design
- [ ] Game replay and analysis tools

## Development

### Build for production:
```bash
npm run build
npm start
```

### Lint code:
```bash
npm run lint
```

## Notes

- Demo data is generated for unknown opponent IDs
- Engine moves use a simplified strength algorithm (MVP)
- Blindfold mode requires audio/visual feedback for full experience
- All game sessions are in-memory (no persistence)

## License

MIT
