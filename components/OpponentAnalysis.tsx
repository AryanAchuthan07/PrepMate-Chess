'use client'

import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface Opponent {
  id: string
  name: string
  currentRating: number
  peakRating: number
  peakDate: string
  ratingHistory: { year: number; rating: number }[]
  trend: string
}

interface ChessComAnalysis {
  username: string
  profile: {
    name?: string
    title?: string
    country?: string
    followers?: number
    lastOnline?: number
  }
  stats: {
    totalGames: number
    wins: number
    losses: number
    draws: number
    highestRatedWin?: {
      opponent: string
      rating: number
      url?: string
    }
  }
  openings: {
    white: { name: string; count: number }[]
    black: { name: string; count: number }[]
  }
  recentGamesAnalyzed: number
}

export default function OpponentAnalysis() {
  const [id, setId] = useState('')
  const [chessComUsername, setChessComUsername] = useState('')
  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [chessComData, setChessComData] = useState<ChessComAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [chessComLoading, setChessComLoading] = useState(false)
  const [error, setError] = useState('')
  const [chessComError, setChessComError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim()) {
      setError('Please enter a valid ID')
      return
    }

    setLoading(true)
    setError('')
    setChessComError('')
    setChessComData(null)

    try {
      const response = await fetch('/api/opponent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim() }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || 'Failed to fetch opponent data')
        setOpponent(null)
      } else {
        setOpponent(data.opponent)
      }
    } catch (err) {
      setError('Network error. Please try again.')
      setOpponent(null)
    } finally {
      setLoading(false)
    }

    const username = chessComUsername.trim()
    if (username) {
      setChessComLoading(true)
      try {
        const response = await fetch('/api/chesscom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username }),
        })

        const data = await response.json()

        if (!response.ok || !data.success) {
          setChessComError(data.error || 'Failed to fetch Chess.com analysis')
          setChessComData(null)
        } else {
          setChessComData(data.analysis)
        }
      } catch (err) {
        setChessComError('Network error. Please try again.')
        setChessComData(null)
      } finally {
        setChessComLoading(false)
      }
    }
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600'
      case 'declining':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatLastOnline = (timestamp?: number) => {
    if (!timestamp) return 'Unknown'
    return new Date(timestamp * 1000).toLocaleDateString()
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Opponent Analysis
      </h2>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Enter FIDE ID..."
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Optional: Chess.com username"
            value={chessComUsername}
            onChange={(e) => setChessComUsername(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading || chessComLoading}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {opponent && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Opponent Report: {opponent.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Current Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {opponent.currentRating}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Peak Rating</p>
                <p className="text-2xl font-bold text-gray-900">
                  {opponent.peakRating}
                </p>
                <p className="text-xs text-gray-500">{opponent.peakDate}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Trend</p>
                <p className={`text-2xl font-bold capitalize ${getTrendColor(opponent.trend)}`}>
                  {opponent.trend}
                </p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Rating History
            </h4>
            {opponent.ratingHistory.length > 0 ? (
              (() => {
                const data = [...opponent.ratingHistory].sort((a, b) => a.year - b.year)
                // ensure numeric years
                data.forEach((d) => (d.year = Number(d.year)))
                const years = data.map((d) => d.year)
                // generate ticks: show all years if <=10 else sample every n years
                let ticks: number[] = []
                if (years.length <= 10) ticks = years
                else {
                  const step = Math.ceil(years.length / 10)
                  ticks = years.filter((_, i) => i % step === 0)
                  if (ticks[ticks.length - 1] !== years[years.length - 1]) ticks.push(years[years.length - 1])
                }

                return (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" type="number" domain={[Math.min(...years), Math.max(...years)]} ticks={ticks} />
                      <YAxis domain={[dataMin => Math.max(800, dataMin - 50), dataMax => dataMax + 50]} />
                      <Tooltip formatter={(value) => value.toLocaleString()} />
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="#2563eb"
                        dot={{ fill: '#2563eb' }}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )
              })()
            ) : (
              <p className="text-gray-500">No rating history available</p>
            )}
          </div>

          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Chess.com Insights
            </h4>
            {chessComLoading && (
              <p className="text-gray-500">Loading Chess.com analysis...</p>
            )}
            {chessComError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {chessComError}
              </div>
            )}
            {chessComData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">Profile</p>
                    <p className="text-lg font-bold text-gray-900">
                      {chessComData.profile.name || chessComData.username}
                    </p>
                    <p className="text-xs text-gray-500">
                      Last online: {formatLastOnline(chessComData.profile.lastOnline)}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">Results (recent)</p>
                    <p className="text-lg font-bold text-gray-900">
                      {chessComData.stats.wins}W / {chessComData.stats.losses}L / {chessComData.stats.draws}D
                    </p>
                    <p className="text-xs text-gray-500">
                      Games analyzed: {chessComData.recentGamesAnalyzed}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-sm">Best Win</p>
                    {chessComData.stats.highestRatedWin ? (
                      <p className="text-lg font-bold text-gray-900">
                        {chessComData.stats.highestRatedWin.rating} vs {chessComData.stats.highestRatedWin.opponent}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">No wins found</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-sm mb-2">Top White Openings</p>
                    {chessComData.openings.white.length ? (
                      <ul className="space-y-1 text-sm text-gray-900">
                        {chessComData.openings.white.map((o) => (
                          <li key={`w-${o.name}`}>{o.name} • {o.count}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No openings detected</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-600 text-sm mb-2">Top Black Openings</p>
                    {chessComData.openings.black.length ? (
                      <ul className="space-y-1 text-sm text-gray-900">
                        {chessComData.openings.black.map((o) => (
                          <li key={`b-${o.name}`}>{o.name} • {o.count}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No openings detected</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              !chessComLoading && (
                <p className="text-gray-500">
                  Add a Chess.com username to view opening trends and best wins.
                </p>
              )
            )}
          </div>
        </div>
      )}

      {!opponent && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Enter a FIDE ID to view opponent analysis
          </p>
        </div>
      )}
    </div>
  )
}
