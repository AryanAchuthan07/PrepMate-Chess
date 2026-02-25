import React from 'react'

interface VisualBoardProps {
  lastMoveTo?: string | null
}

const files = ['a','b','c','d','e','f','g','h']
const ranks = [8,7,6,5,4,3,2,1]

export default function VisualBoard({ lastMoveTo }: VisualBoardProps) {
  const isHighlight = (file: string, rank: number) => {
    if (!lastMoveTo) return false
    const target = `${file}${rank}`
    return target === lastMoveTo
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="grid grid-cols-8 gap-0 border rounded overflow-hidden shadow-inner">
        {ranks.map((r) =>
          files.map((f, i) => {
            const light = (files.indexOf(f) + r) % 2 === 0
            const key = `${f}${r}`
            return (
              <div
                key={key}
                className={`w-10 h-10 flex items-center justify-center text-xs font-mono ${
                  light ? 'bg-gray-100' : 'bg-gray-700 text-white'
                } ${isHighlight(f, r) ? 'ring-4 ring-yellow-300' : ''}`}
              >
                {isHighlight(f, r) ? key : ''}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
