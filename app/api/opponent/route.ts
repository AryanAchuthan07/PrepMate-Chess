import { NextRequest, NextResponse } from 'next/server'

// Mock data for opponents - simulating USCF/FIDE database
const mockDatabase: Record<string, {
  id: string
  name: string
  currentRating: number
  peakRating: number
  peakDate: string
  ratingHistory: { year: number; rating: number }[]
}> = {
  '1234567': {
    id: '1234567',
    name: 'John Doe',
    currentRating: 1825,
    peakRating: 1970,
    peakDate: 'July 2021',
    ratingHistory: [
      { year: 2018, rating: 1420 },
      { year: 2019, rating: 1560 },
      { year: 2020, rating: 1600 },
      { year: 2021, rating: 1700 },
      { year: 2022, rating: 1970 },
      { year: 2023, rating: 1825 },
    ],
  },
  '9876543': {
    id: '9876543',
    name: 'Jane Smith',
    currentRating: 2100,
    peakRating: 2150,
    peakDate: 'December 2022',
    ratingHistory: [
      { year: 2020, rating: 1900 },
      { year: 2021, rating: 1950 },
      { year: 2022, rating: 2100 },
      { year: 2023, rating: 2150 },
    ],
  },
  'fide_2000000': {
    id: 'fide_2000000',
    name: 'Grandmaster Alex',
    currentRating: 2650,
    peakRating: 2750,
    peakDate: 'March 2023',
    ratingHistory: [
      { year: 2019, rating: 2500 },
      { year: 2020, rating: 2580 },
      { year: 2021, rating: 2620 },
      { year: 2022, rating: 2700 },
      { year: 2023, rating: 2750 },
    ],
  },
}

// Simple in-memory cache
const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

export async function POST(request: NextRequest) {
  const { id } = await request.json()

  if (!id || typeof id !== 'string') {
    return NextResponse.json(
      { error: 'Invalid ID provided' },
      { status: 400 }
    )
  }

  // Check cache
  const cached = cache.get(id)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 300))

  // Get mock data or simulate API failure
  const opponent = mockDatabase[id]

  if (opponent) {
    const data = {
      success: true,
      opponent: {
        ...opponent,
        trend: calculateTrend(opponent.ratingHistory),
      },
    }
    cache.set(id, { data, timestamp: Date.now() })
    return NextResponse.json(data)
  }

  // Generate random opponent for unknown IDs (demo purposes)
  const demoOpponent = {
    id,
    name: `Player ${id.slice(0, 6)}`,
    currentRating: 1600 + Math.floor(Math.random() * 800),
    peakRating: 1800 + Math.floor(Math.random() * 900),
    peakDate: '2022-2023',
    ratingHistory: generateRandomHistory(),
    trend: 'stable' as const,
  }

  const data = { success: true, opponent: demoOpponent }
  cache.set(id, { data, timestamp: Date.now() })
  return NextResponse.json(data)
}

function calculateTrend(history: { year: number; rating: number }[]): string {
  if (history.length < 2) return 'stable'

  const recent = history.slice(-3)
  const avgRecent = recent.reduce((sum, h) => sum + h.rating, 0) / recent.length
  const avgPrevious =
    history.length > 3
      ? history
          .slice(-6, -3)
          .reduce((sum, h) => sum + h.rating, 0) / 3
      : recent[0].rating

  if (avgRecent > avgPrevious + 50) return 'improving'
  if (avgRecent < avgPrevious - 50) return 'declining'
  return 'stable'
}

function generateRandomHistory() {
  const history = []
  let rating = 1400 + Math.floor(Math.random() * 400)
  for (let year = 2020; year <= 2023; year++) {
    const change = (Math.random() - 0.5) * 200
    rating = Math.max(1000, Math.min(3000, rating + change))
    history.push({ year, rating: Math.round(rating) })
  }
  return history
}
