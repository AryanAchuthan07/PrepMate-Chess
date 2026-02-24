import { NextRequest, NextResponse } from 'next/server'
import { Chess } from 'chess.js'

// Store active games in memory (for MVP)
const activeGames = new Map<
  string,
  {
    chess: any
    moves: string[]
    engineRating: number
    lastUpdated: number
  }
>()

const GAME_TIMEOUT = 30 * 60 * 1000 // 30 minutes

// Cleanup old games
setInterval(() => {
  const now = Date.now()
  for (const [id, game] of activeGames.entries()) {
    if (now - game.lastUpdated > GAME_TIMEOUT) {
      activeGames.delete(id)
    }
  }
}, 5 * 60 * 1000) // Cleanup every 5 minutes

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, gameId, move, engineRating } = body

  if (action === 'create') {
    const newGameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const chess = new Chess()

    activeGames.set(newGameId, {
      chess,
      moves: [],
      engineRating: engineRating || 1600,
      lastUpdated: Date.now(),
    })

    return NextResponse.json({
      success: true,
      gameId: newGameId,
      fen: chess.fen(),
      moves: [],
      status: 'started',
    })
  }

  if (action === 'move') {
    const game = activeGames.get(gameId)
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Try to make user move
    const result = game.chess.move(move, { sloppy: true })

    if (!result) {
      return NextResponse.json({
        success: false,
        error: 'Illegal move',
        validMoves: game.chess.moves({ verbose: true }).map((m: any) => m.san),
        fen: game.chess.fen(),
      })
    }

    game.moves.push(result.san)
    game.lastUpdated = Date.now()

    // Check game status
    if (game.chess.isCheckmate()) {
      activeGames.delete(gameId)
      return NextResponse.json({
        success: true,
        userMoveValid: true,
        move: result.san,
        status: 'checkmate',
        result: 'User won!',
        fen: game.chess.fen(),
        moves: game.moves,
      })
    }

    if (game.chess.isDraw()) {
      activeGames.delete(gameId)
      return NextResponse.json({
        success: true,
        userMoveValid: true,
        move: result.san,
        status: 'draw',
        result: 'Draw',
        fen: game.chess.fen(),
        moves: game.moves,
      })
    }

    // Generate engine move
    const engineMove = getEngineMove(game.chess, game.engineRating)
    if (engineMove) {
      game.chess.move(engineMove)
      game.moves.push(engineMove)
    }

    const inCheck = game.chess.inCheck()
    let status = 'playing'
    let result = null

    if (game.chess.isCheckmate()) {
      status = 'checkmate'
      result = 'Engine won!'
      activeGames.delete(gameId)
    } else if (game.chess.isDraw()) {
      status = 'draw'
      result = 'Draw'
      activeGames.delete(gameId)
    }

    return NextResponse.json({
      success: true,
      userMoveValid: true,
      userMove: result.san,
      engineMove: engineMove,
      status,
      inCheck,
      result,
      fen: game.chess.fen(),
      moves: game.moves,
    })
  }

  if (action === 'resign') {
    const game = activeGames.get(gameId)
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    activeGames.delete(gameId)
    return NextResponse.json({
      success: true,
      status: 'resigned',
      result: 'Engine won by resignation',
      moves: game.moves,
    })
  }

  if (action === 'show-board') {
    const game = activeGames.get(gameId)
    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    const fen = game.chess.fen()
    activeGames.delete(gameId)
    return NextResponse.json({
      success: true,
      status: 'ended',
      result: 'Blindfold mode ended',
      fen,
      moves: game.moves,
    })
  }

  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  )
}

// Simple engine move generator based on difficulty
function getEngineMove(chess: any, engineRating: number): string | null {
  const moves = chess.moves({ verbose: true })

  if (moves.length === 0) {
    return null
  }

  // Difficulty adjusts move selection - lower ratings make weaker moves
  const difficultyScore = Math.max(1, engineRating / 500)
  const moveCount = Math.max(1, Math.floor(moves.length / difficultyScore))

  // Shuffle and pick from top moves
  const shuffled = moves.sort(() => Math.random() - 0.5)

  // Try to find checkmate
  for (const move of moves) {
    const tempChess = new Chess(chess.fen())
    tempChess.move(move.san)
    if (tempChess.isCheckmate()) {
      return move.san
    }
  }

  // Try to find check
  if (Math.random() < difficultyScore * 0.2) {
    for (const move of moves) {
      const tempChess = new Chess(chess.fen())
      tempChess.move(move.san)
      if (tempChess.inCheck()) {
        return move.san
      }
    }
  }

  return shuffled[0]?.san || null
}
