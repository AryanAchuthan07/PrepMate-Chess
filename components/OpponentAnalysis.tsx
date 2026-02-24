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

export default function OpponentAnalysis() {
  const [id, setId] = useState('')
  const [opponent, setOpponent] = useState<Opponent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id.trim()) {
      setError('Please enter a valid ID')
      return
    }

    setLoading(true)
    setError('')

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

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Opponent Analysis
      </h2>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter USCF ID or FIDE ID..."
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={opponent.ratingHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis domain={['dataMin - 50', 'dataMax + 50']} />
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
            ) : (
              <p className="text-gray-500">No rating history available</p>
            )}
          </div>
        </div>
      )}

      {!opponent && !error && (
        <div className="text-center py-12">
          <p className="text-gray-500">
            Enter a USCF or FIDE ID to view opponent analysis
          </p>
        </div>
      )}
    </div>
  )
}
