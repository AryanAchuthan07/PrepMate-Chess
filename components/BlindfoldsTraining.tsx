'use client'

import { useState, useRef, useEffect } from 'react'
import VisualBoard from './VisualBoard'
import { Chess } from 'chess.js'

interface ChessBoardProps {
  fen: string
  showBoard: boolean
}

interface GameState {
  gameId: string | null
  status: 'idle' | 'playing' | 'finished'
  moves: string[]
  inCheck: boolean
  result: string | null
  fen: string
}

export default function BlindfoldsTraining() {
  const [engineRating, setEngineRating] = useState(1600)
  const [gameState, setGameState] = useState<GameState>({
    gameId: null,
    status: 'idle',
    moves: [],
    inCheck: false,
    result: null,
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  })
  const [move, setMove] = useState('')
  const [feedback, setFeedback] = useState('')
  const [showBoard, setShowBoard] = useState(false)
  const moveInputRef = useRef<HTMLInputElement>(null)
  const [highlights, setHighlights] = useState<Array<{ id: string; squares: string[] }>>([])

  useEffect(() => {
    if (moveInputRef.current && gameState.status === 'playing') {
      moveInputRef.current.focus()
    }
  }, [gameState.status])

  useEffect(() => {
    // compute last two moves (most recent first) and their travelled squares
    if (!gameState.moves || gameState.moves.length === 0) {
      setHighlights([])
      return
    }

    try {
      const chess = new Chess()
      const movesInfo: Array<{ from: string; to: string; piece: string; flags?: string }> = []
      for (const san of gameState.moves) {
        const res = chess.move(san, { sloppy: true })
        if (res && res.from && res.to) {
          movesInfo.push({ from: res.from, to: res.to, piece: res.piece, flags: res.flags })
        }
      }

      const computePath = (from: string, to: string, piece?: string, flags?: string) => {
        const filesIdx = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 }
        const fileFrom = from[0]
        const rankFrom = Number(from[1])
        const fileTo = to[0]
        const rankTo = Number(to[1])
        const fx = filesIdx[fileFrom]
        const tx = filesIdx[fileTo]
        const fy = rankFrom
        const ty = rankTo

        // knight jumps - just start and end
        if (piece === 'n') return [from, to]

        const dx = tx - fx
        const dy = ty - fy

        const steps = Math.max(Math.abs(dx), Math.abs(dy))
        const path: string[] = []
        const stepX = dx === 0 ? 0 : dx / Math.abs(dx)
        const stepY = dy === 0 ? 0 : dy / Math.abs(dy)

        // include from square
        path.push(from)

        // for pawn double push include intermediate
        if (piece === 'p' && Math.abs(dy) === 2 && dx === 0) {
          const midRank = fy + (dy / 2)
          path.push(`${fileFrom}${midRank}`)
        }

        // sliding pieces and single steps
        if (steps > 0) {
          for (let i = 1; i <= steps; i++) {
            const nx = fx + Math.round(stepX * i)
            const ny = fy + Math.round(stepY * i)
            if (nx >= 0 && nx < 8 && ny >= 1 && ny <= 8) {
              const file = Object.keys(filesIdx)[nx]
              path.push(`${file}${ny}`)
            }
          }
        }

        return Array.from(new Set(path))
      }

      const lastTwo = movesInfo.slice(-2)
      const highlightArr: Array<{ id: string; squares: string[] }> = []
      for (let i = lastTwo.length - 1; i >= 0; i--) {
        const idxFromEnd = lastTwo.length - 1 - i
        const mv = lastTwo[i]
        const squares = computePath(mv.from, mv.to, mv.piece, mv.flags)
        // push with most recent first (index 0)
        highlightArr.unshift({ id: `mv-${idxFromEnd}`, squares })
      }

      // ensure order: most recent move at index 0, second-most at index 1
      // movesInfo.slice(-2) returns [secondLast, last], so we want last first
      if (movesInfo.length >= 2) {
        const second = movesInfo[movesInfo.length - 2]
        const last = movesInfo[movesInfo.length - 1]
        setHighlights([
          { id: 'last', squares: computePath(last.from, last.to, last.piece, last.flags) },
          { id: 'second', squares: computePath(second.from, second.to, second.piece, second.flags) },
        ])
      } else {
        const only = movesInfo[movesInfo.length - 1]
        setHighlights([{ id: 'last', squares: computePath(only.from, only.to, only.piece, only.flags) }])
      }
    } catch (e) {
      setHighlights([])
    }
  }, [gameState.moves])

  const startGame = async () => {
    setFeedback('')
    const response = await fetch('/api/chess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', engineRating }),
    })

    const data = await response.json()
    if (data.success) {
      setGameState({
        gameId: data.gameId,
        status: 'playing',
        moves: [],
        inCheck: false,
        result: null,
        fen: data.fen,
      })
      setMove('')
    }
  }

  const submitMove = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!move.trim() || !gameState.gameId) return

    // Normalize SAN: allow user to type lower/upper case for pieces and promotions
      const normalizeSAN = (m: string) => {
      let s = m.trim()
      if (!s) return s

      // Normalize castling (allow 0 or o)
      if (/^[0o]-/i.test(s)) {
        return s.toUpperCase().replace(/0/g, 'O')
      }

      // Uppercase promotion piece (e8q or e8=q)
        s = s.replace(/([a-h][18]=?)([nbrqk])/i, (__, p1, p2) => p1 + p2.toUpperCase())

      // If the move starts with a piece letter (nbkrq) and is not a pawn move (file+rank), uppercase it
      if (/^[nbrqk]/i.test(s) && !/^[a-h][1-8]/i.test(s)) {
        s = s[0].toUpperCase() + s.slice(1)
      }

        // Strip trailing check/checkmate symbols + or # — accept SAN without them
        s = s.replace(/[+#]+$/g, '')

      return s
    }

    const moveStr = normalizeSAN(move)
    setMove('')
    setFeedback('')

    try {
      const response = await fetch('/api/chess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          gameId: gameState.gameId,
          move: moveStr,
        }),
      })

      const data = await response.json()

      if (!data.success && data.error) {
        setFeedback(`❌ ${data.error}`)
        if (data.validMoves) {
          setFeedback(
            (prev) =>
              `${prev}\nValid moves: ${data.validMoves.slice(0, 5).join(', ')}${
                data.validMoves.length > 5 ? '...' : ''
              }`
          )
        }
      } else {
        setGameState((prev) => ({
          ...prev,
          moves: data.moves,
          fen: data.fen,
          inCheck: data.inCheck || false,
        }))

        if (data.status === 'playing') {
          setFeedback(`${data.userMove} • Engine: ${data.engineMove}`)
          if (data.inCheck) {
            setFeedback((prev) => prev + ' • Check!')
          }
        } else {
          setGameState((prev) => ({
            ...prev,
            status: 'finished',
            result: data.result,
          }))
          setFeedback(data.result || 'Game ended')
        }
      }
    } catch (err) {
      setFeedback('❌ Network error. Please try again.')
    }
  }

  const resignGame = async () => {
    if (!gameState.gameId) return

    try {
      await fetch('/api/chess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resign', gameId: gameState.gameId }),
      })

      setGameState((prev) => ({
        ...prev,
        status: 'finished',
        result: 'You resigned',
      }))
      setFeedback('Game resigned')
    } catch (err) {
      setFeedback('❌ Failed to resign')
    }
  }

  const showBoardToggle = async () => {
    if (!gameState.gameId) return

    try {
      const response = await fetch('/api/chess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'show-board', gameId: gameState.gameId }),
      })

      const data = await response.json()
      setShowBoard(true)
      setGameState((prev) => ({
        ...prev,
        status: 'finished',
        result: data.result,
        fen: data.fen,
      }))
    } catch (err) {
      setFeedback('❌ Failed to show board')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Blindfold Chess Training
      </h2>

      {gameState.status === 'idle' && (
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Engine Strength: {engineRating}
            </label>
            <input
              type="range"
              min="800"
              max="3000"
              step="50"
              value={engineRating}
              onChange={(e) => setEngineRating(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Beginner</span>
              <span>Master</span>
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
          >
            Start Training
          </button>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <strong>How to play:</strong> Enter moves in algebraic notation
              (e.g., e4, Nf3, exd5). The board is hidden - trust your
              visualization!
            </p>
          </div>
        </div>
      )}

      {(gameState.status === 'playing' || gameState.status === 'finished') && (
        <div className="space-y-6">
          <div>
            <VisualBoard fen={gameState.fen} showPieces={showBoard} highlights={highlights} />
          </div>

          {!showBoard && gameState.status === 'playing' && (
            <div className="bg-gray-900 p-4 rounded-lg text-center">
              <p className="text-gray-300 text-sm">BLINDFOLD MODE</p>
              <p className="text-gray-500 text-xs">Board is hidden (visual hints shown below)</p>
            </div>
          )}

          {showBoard && gameState.status === 'finished' && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Final Position:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-600 text-sm font-mono">
                {gameState.fen}
              </div>
            </div>
          )}

          <form onSubmit={submitMove} className="space-y-2">
            <input
              ref={moveInputRef}
              type="text"
              placeholder="Enter move: Nf3"
              value={move}
              onChange={(e) => setMove(e.target.value)}
              disabled={gameState.status !== 'playing'}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={gameState.status !== 'playing' || !move.trim()}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
            >
              Submit
            </button>
          </form>

          {feedback && (
            <div
              className={`p-4 rounded-lg text-sm font-semibold ${
                feedback.includes('❌')
                  ? 'bg-red-50 border border-red-200 text-red-700'
                  : 'bg-green-50 border border-green-200 text-green-700'
              }`}
            >
              {feedback}
            </div>
          )}

          <div className="text-sm">
            <p className="font-semibold text-gray-900 mb-2">Move History:</p>
            <p className="text-gray-700 font-mono bg-gray-50 p-3 rounded-lg min-h-[50px]">
              {gameState.moves.join(' ') || 'No moves yet'}
            </p>
          </div>

          {gameState.status === 'playing' && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resignGame}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700"
              >
                Resign Game
              </button>
              <button
                type="button"
                onClick={showBoardToggle}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
              >
                Show Board
              </button>
            </div>
          )}

          {gameState.status === 'finished' && (
            <div>
              <div
                className={`p-4 rounded-lg text-center mb-4 ${
                  gameState.result?.includes('won')
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-yellow-50 border border-yellow-200'
                }`}
              >
                <p className="text-lg font-bold text-gray-900">
                  {gameState.result}
                </p>
              </div>
              <button
                onClick={() => {
                  setGameState({
                    gameId: null,
                    status: 'idle',
                    moves: [],
                    inCheck: false,
                    result: null,
                    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                  })
                  setShowBoard(false)
                  setFeedback('')
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700"
              >
                Play Again
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
