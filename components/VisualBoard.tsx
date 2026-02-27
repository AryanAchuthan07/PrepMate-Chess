import React from 'react'

interface VisualBoardProps {
  fen?: string
  showPieces?: boolean
  highlights?: Array<{ id: string; squares: string[] }>
}

const files = ['a','b','c','d','e','f','g','h']
const ranks = [8,7,6,5,4,3,2,1]

const pieceToUnicode: Record<string, string> = {
  P: '♙',
  N: '♘',
  B: '♗',
  R: '♖',
  Q: '♕',
  K: '♔',
  p: '♟',
  n: '♞',
  b: '♝',
  r: '♜',
  q: '♛',
  k: '♚',
}

function parseFEN(fen?: string) {
  const map = new Map<string, string>()
  if (!fen) return map
  const parts = fen.split(' ')
  const rows = parts[0].split('/')
  for (let r = 0; r < 8; r++) {
    const row = rows[r]
    let fileIdx = 0
    for (const ch of row) {
      if (/[1-8]/.test(ch)) {
        fileIdx += Number(ch)
      } else {
        const file = files[fileIdx]
        const rank = 8 - r
        map.set(`${file}${rank}`, ch)
        fileIdx += 1
      }
    }
  }
  return map
}

export default function VisualBoard({ fen, showPieces = false, highlights = [] }: VisualBoardProps) {
  const pieceMap = parseFEN(showPieces ? fen : undefined)

  // build a quick lookup for highlights -> provide priority by index
  const highlightLookup = new Map<string, { id: string; index: number }>()
  for (let i = 0; i < highlights.length; i++) {
    for (const s of highlights[i].squares) {
      highlightLookup.set(s, { id: highlights[i].id, index: i })
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="grid grid-cols-8 gap-0 border rounded overflow-hidden shadow-inner">
        {ranks.map((r) =>
          files.map((f) => {
            const light = (files.indexOf(f) + r) % 2 === 0
            const key = `${f}${r}`
            const h = highlightLookup.get(key)

            // determine classes for highlight types
            let highlightClass = ''
            let innerDot = ''
            if (h) {
              // index 0 -> most recent move, index 1 -> second most recent
              if (h.index === 0) {
                highlightClass = 'bg-yellow-200'
                innerDot = 'ring-2 ring-yellow-500'
              } else if (h.index === 1) {
                highlightClass = 'bg-indigo-200'
                innerDot = 'ring-2 ring-indigo-600'
              } else {
                highlightClass = 'bg-gray-300'
                innerDot = 'ring-1 ring-gray-500'
              }
            }

            const piece = pieceMap.get(key)

            return (
              <div
                key={key}
                className={`w-12 h-12 flex items-center justify-center text-xl select-none ${
                  light ? 'bg-amber-50' : 'bg-amber-900 text-white'
                } ${highlightClass}`}
              >
                <div className={`flex items-center justify-center w-full h-full ${innerDot}`}>
                  {showPieces && piece ? (
                    <span className="text-2xl leading-none">{pieceToUnicode[piece] || ''}</span>
                  ) : (
                    <span className="w-full h-full" />
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
