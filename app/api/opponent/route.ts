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

  // Simulate small API call delay
  await new Promise((resolve) => setTimeout(resolve, 200))

  // Return mock database match quickly
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

  // Try to fetch from external sources when possible
  let fetched: any = null
  try {
    if (id.startsWith('fide_')) {
      const num = id.replace(/^fide_/, '')
      fetched = await fetchFideProfile(num)
    } else if (/^\d{6,8}$/.test(id)) {
      // 6-8 digit numeric IDs are frequently FIDE IDs - try FIDE first
      fetched = await fetchFideProfile(id)
      // If it's 7 digits and FIDE lookup failed, try USCF as fallback
      if (!fetched && id.length === 7) {
        fetched = await fetchUscfProfile(id)
      }
    } else if (/^\d{7}$/.test(id)) {
      // 7-digit IDs likely USCF (fallback)
      fetched = await fetchUscfProfile(id)
    }
  } catch (e) {
    // ignore fetch errors and fall back to demo
    fetched = null
  }

  if (fetched && fetched.name) {
    const opponentData = {
      id,
      name: fetched.name,
      currentRating: fetched.currentRating || 1600,
      peakRating: fetched.peakRating || fetched.currentRating || 1800,
      peakDate: fetched.peakDate || 'Unknown',
      ratingHistory: fetched.ratingHistory || generateHistoryFromRating(fetched.currentRating || 1600),
      trend: calculateTrend(fetched.ratingHistory || generateHistoryFromRating(fetched.currentRating || 1600)),
    }

    const data = { success: true, opponent: opponentData }
    cache.set(id, { data, timestamp: Date.now() })
    return NextResponse.json(data)
  }

  // Fallback: generate random opponent for unknown IDs (demo purposes)
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

async function fetchFideProfile(idNum: string) {
  try {
    const url = `https://ratings.fide.com/profile/${encodeURIComponent(idNum)}`
    const res = await fetch(url)
    if (!res.ok) return null
    const text = await res.text()

    // Try to extract name: look for <title> or first <h1>
    let name: string | null = null
    const titleMatch = text.match(/<title>([^<]+)<\/title>/i)
    if (titleMatch) {
      const title = titleMatch[1]
      // common pattern: "LAST, First - FIDE ratings"
      name = title.split('-')[0].trim()
    }

    if (!name) {
      const h1Match = text.match(/<h1[^>]*>([^<]+)<\/h1>/i)
      if (h1Match) name = h1Match[1].trim()
    }

    // Clean up name (remove trailing site-suffixes and reformat "Last, First")
    if (name) {
      name = cleanName(name)
    }

    // Clean up name if found in h1
    if (name) name = cleanName(name)

    // Try multiple ways to extract a standard rating
    let currentRating: number | null = null
    const patterns = [
      /Standard[^\d]{0,80}(\d{3,4})/i,
      /(\d{3,4})[^\d]{0,20}Standard/i,
      /Standard Rating[:\s\-]{0,10}(\d{3,4})/i,
      /FIDE rating[:\s\-]{0,10}(\d{3,4})/i,
    ]
    for (const p of patterns) {
      const m = text.match(p)
      if (m) {
        currentRating = Number(m[1])
        break
      }
    }

    // If still not found, pick the most plausible 3-4 digit number near the top of the page
    if (!currentRating) {
      const nums = Array.from(text.matchAll(/(\d{3,4})/g)).map((r) => Number(r[1]))
      if (nums.length) {
        // prefer higher ratings in plausible range
        const candidates = nums.filter((n) => n >= 1000 && n <= 3000)
        if (candidates.length) {
          currentRating = Math.max(...candidates.slice(0, 10))
        }
      }
    }

    // Try to extract historical year-rating pairs from the page
    const history: { year: number; rating: number }[] = []
    for (const match of text.matchAll(/(20\d{2})[^\d]{0,50}(\d{3,4})/g)) {
      const year = Number(match[1])
      const rating = Number(match[2])
      if (year >= 2000 && year <= new Date().getFullYear() && rating >= 800 && rating <= 3000) {
        history.push({ year, rating })
      }
    }

    // Normalize and dedupe history by year (keep last seen), sort ascending
    let ratingHistory: { year: number; rating: number }[] | undefined = undefined
    if (history.length) {
      const map = new Map<number, number>()
      for (const h of history) map.set(h.year, h.rating)
      const years = Array.from(map.keys()).sort((a, b) => a - b)
      ratingHistory = years.map((y) => ({ year: y, rating: map.get(y)! }))
      // Limit to most recent 6 entries
      if (ratingHistory.length > 6) {
        ratingHistory = ratingHistory.slice(-6)
      }
    }

    return { name, currentRating, ratingHistory }
  } catch (e) {
    return null
  }
}

async function fetchUscfProfile(idNum: string) {
  try {
    // Try a couple of likely USCF profile endpoints and the legacy MSA profile page
    const candidates = [
      `https://new.uschess.org/players/${encodeURIComponent(idNum)}`,
      `https://www.uschess.org/players/${encodeURIComponent(idNum)}`,
      `https://www.uschess.org/msa/MbrDtlMain.php?ID=${encodeURIComponent(idNum)}`,
      `https://new.uschess.org/msa/MbrDtlMain.php?ID=${encodeURIComponent(idNum)}`,
    ]
    for (const url of candidates) {
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const text = await res.text()
        let name: string | null = null
        const titleMatch = text.match(/<title>([^<]+)<\/title>/i)
        if (titleMatch) name = titleMatch[1].split('-')[0].trim()
        if (!name) {
          const h1Match = text.match(/<h1[^>]*>([^<]+)<\/h1>/i)
          if (h1Match) name = h1Match[1].trim()
        }

        if (name) name = cleanName(name)

        // get numeric rating if present - try several patterns including the MSA layout
        let currentRating: number | null = null
        const ratingPatterns = [
          /(USCF[^\d]{0,20}|US Chess Rating[^\d]{0,20})(\d{3,4})/i,
          /(Standard|Rating|USCF Rating)[:\s\-]{0,10}(\d{3,4})/i,
          />(\d{3,4})<\/td>\s*<td[^>]*>Standard/i,
        ]
        for (const p of ratingPatterns) {
          const m = text.match(p)
          if (m) {
            currentRating = Number(m[m.length - 1])
            break
          }
        }

        // If still not found, look for the first plausible 3-4 digit number
        if (!currentRating) {
          const nums = Array.from(text.matchAll(/(\d{3,4})/g)).map((r) => Number(r[1]))
          const candidates = nums.filter((n) => n >= 800 && n <= 3000)
          if (candidates.length) currentRating = candidates[0]
        }

        if (name) return { name, currentRating }
      } catch {
        continue
      }
    }
    return null
  } catch (e) {
    return null
  }
}

function generateHistoryFromRating(currentRating: number) {
  const history = [] as { year: number; rating: number }[]
  let r = Math.max(1000, Math.min(3000, Math.round(currentRating)))
  for (let year = 2020; year <= 2023; year++) {
    const jitter = Math.round((Math.random() - 0.5) * 120)
    history.push({ year, rating: Math.max(1000, Math.min(3000, r + jitter)) })
  }
  return history
}

function cleanName(raw: string | null): string | null {
  if (!raw) return null
  let s = raw

  // Remove common trailing site suffixes like "FIDE Profile", "FIDE ratings", etc.
  s = s.replace(/\b(FIDE|Profile|ratings|ratings profile|FIDE Profile)\b.*/i, '')

  // Trim and remove extra separators
  s = s.replace(/[\u2013\u2014\-–—].*$/, '').trim()

  // If format is "Last, First" convert to "First Last"
  if (/,/.test(s)) {
    const parts = s.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      s = parts.slice(1).concat(parts[0]).join(' ')
    }
  }

  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim()
  return s || null
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
