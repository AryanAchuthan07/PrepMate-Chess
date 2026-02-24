// Utility functions for chess move validation and formatting

/**
 * Parse algebraic notation move into human-readable format
 */
export function formatMove(move: string): string {
  const moveStr = move.toUpperCase()
  
  // Handle castling
  if (moveStr === 'O-O') return 'Kingside Castling'
  if (moveStr === 'O-O-O') return 'Queenside Castling'
  
  // Piece symbols
  const pieces: Record<string, string> = {
    K: '♔',
    Q: '♕',
    R: '♖',
    B: '♗',
    N: '♘',
    P: '',
  }
  
  return moveStr
}

/**
 * Get valid moves from a position
 */
export function getValidMoves(moves: any[]): string[] {
  return moves.map((m) => (typeof m === 'string' ? m : m.san))
}

/**
 * Validate USCF or FIDE ID format
 */
export function isValidPlayerId(id: string): boolean {
  // USCF: 7-digit number
  // FIDE: fide_[number] or 6-digit number
  return (
    /^\d{7}$/.test(id) ||
    /^\d{6}$/.test(id) ||
    /^fide_\d+$/.test(id)
  )
}

/**
 * Calculate ELO rating change
 */
export function calculateRatingChange(
  currentRating: number,
  opponentRating: number,
  result: 'win' | 'draw' | 'loss',
  kFactor: number = 32
): number {
  const expectedScore =
    1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400))
  const actualScore = result === 'win' ? 1 : result === 'draw' ? 0.5 : 0

  return Math.round(kFactor * (actualScore - expectedScore))
}

/**
 * Get rating category
 */
export function getRatingCategory(rating: number): string {
  if (rating < 1000) return 'Beginner'
  if (rating < 1400) return 'Amateur'
  if (rating < 1800) return 'Intermediate'
  if (rating < 2200) return 'Advanced'
  if (rating < 2400) return 'Expert'
  if (rating < 2600) return 'Master'
  return 'Grandmaster'
}
