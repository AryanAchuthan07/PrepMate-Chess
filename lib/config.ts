// Configuration constants for PrepMate Chess

export const CONFIG = {
  // Opponent Analysis
  OPPONENT: {
    CACHE_TTL_MS: 60 * 60 * 1000, // 1 hour
    REQUEST_TIMEOUT_MS: 5000,
    MAX_CHART_POINTS: 20,
  },

  // Chess Game
  CHESS: {
    GAME_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
    CLEANUP_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
    MIN_ENGINE_RATING: 800,
    MAX_ENGINE_RATING: 3000,
    DEFAULT_ENGINE_RATING: 1600,
  },

  // UI
  UI: {
    ANIMATION_DURATION_MS: 300,
    DEBOUNCE_MS: 200,
  },

  // API
  API: {
    OPPONENT_ENDPOINT: '/api/opponent',
    CHESS_ENDPOINT: '/api/chess',
  },
}

export const SAMPLE_IDS = [
  {
    id: 'fide_2000000',
    name: 'Grandmaster Alex',
    description: 'FIDE Player - Rating ~2650',
  },
]

export const RATING_CATEGORIES = [
  { min: 0, max: 999, label: 'Beginner', color: '#ef4444' },
  { min: 1000, max: 1399, label: 'Amateur', color: '#f97316' },
  { min: 1400, max: 1799, label: 'Intermediate', color: '#eab308' },
  { min: 1800, max: 2199, label: 'Advanced', color: '#22c55e' },
  { min: 2200, max: 2399, label: 'Expert', color: '#06b6d4' },
  { min: 2400, max: 2599, label: 'Master', color: '#8b5cf6' },
  { min: 2600, max: 3000, label: 'Grandmaster', color: '#ec4899' },
]

export const CHESS_MOVES_EXAMPLES = [
  'e4 - King\'s Pawn Opening',
  'd4 - Queen\'s Pawn Opening',
  'c4 - English Opening',
  'Nf3 - Knight Opening',
  'e5 - Classic Defense',
  'exd4 - Capture on d4 (pawn)',
  'Nxe5 - Knight captures on e5',
  'Bd3 - Bishop to d3',
  'O-O - Kingside Castling',
  'O-O-O - Queenside Castling',
]
