import { NextRequest, NextResponse } from 'next/server'
// import small utilities
import { parseFideJSRatingHistory as _parseFideJSRatingHistory, parseFideTableHistory as _parseFideTableHistory, normalizeHistory as _normalizeHistory, derivePeakFromHistory as _derivePeakFromHistory } from '../../../lib/opponent-utils'

// Mock data for opponents - simulating FIDE database
const mockDatabase: Record<string, {
  id: string
  name: string
  currentRating: number
  peakRating: number
  peakDate: string
  ratingHistory: { year: number; rating: number }[]
}> = {
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
  const body = await request.json()
  const id = body?.id
  const debugMode = !!body?.debug

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
      fetched = await fetchFideProfile(num, debugMode)
    } else if (/^\d{6,8}$/.test(id)) {
      // 6-8 digit numeric IDs are treated as FIDE IDs
      fetched = await fetchFideProfile(id, debugMode)
    }
  } catch (e) {
    // ignore fetch errors and fall back to demo
    fetched = null
  }

  if (fetched && fetched.name) {
    const ratingHistory = fetched.ratingHistory || generateHistoryFromRating(fetched.currentRating || 1600)
    const opponentData = {
      id,
      name: fetched.name,
      currentRating: fetched.currentRating || 1600,
      peakRating: fetched.peakRating || (ratingHistory.length ? Math.max(...ratingHistory.map((r: any) => r.rating)) : (fetched.currentRating || 1800)),
      peakDate: fetched.peakDate || (() => {
        const peak = ratingHistory.reduce((best: any, cur: any) => (cur.rating > best.rating ? cur : best), ratingHistory[0])
        return peak ? `${peak.year}` : 'Unknown'
      })(),
      ratingHistory,
      trend: calculateTrend(ratingHistory),
    }

    const data: any = { success: true, opponent: opponentData }
    if (debugMode && (fetched as any)?._debug) data._debug = (fetched as any)._debug
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

async function fetchFideProfile(idNum: string, debug = false) {
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

    // Prefer numbers near the word 'Standard' (case-insensitive)
    let currentRating: number | null = null
    // Try a tight match where the rating is shown in a <p> before a 'STANDARD' label
    const pStandardMatch = text.match(/<p[^>]*>\s*(\d{3,4})\s*<\/p>\s*<p[^>]*>\s*STANDARD/i)
    if (pStandardMatch) {
      currentRating = Number(pStandardMatch[1])
    } else {
      const idx = text.search(/standard/i)
      if (idx !== -1) {
        // search within 200 chars around the match for a 3-4 digit number
        const windowStart = Math.max(0, idx - 200)
        const windowEnd = Math.min(text.length, idx + 200)
        const window = text.slice(windowStart, windowEnd)
        const m = window.match(/(\d{3,4})/)
        if (m) currentRating = Number(m[1])
      }
    }

    // additional heuristic: find any 3-4 digit number that is immediately followed by a 'STANDARD' token nearby
    if (!currentRating) {
      for (const nm of text.matchAll(/(\d{3,4})/g)) {
        const num = Number(nm[1])
        if (num < 800 || num > 3000) continue
        const endIdx = nm.index! + nm[0].length
        const window = text.slice(endIdx, endIdx + 80)
        if (/STANDARD/i.test(window)) {
          currentRating = num
          break
        }
      }
    }

    // If still not found, try several patterns across the page
    if (!currentRating) {
      const patterns = [
        /Standard[^\d]{0,80}(\d{3,4})/i,
        /(\d{3,4})[^\d]{0,20}Standard/i,
        /Standard Rating[:\s\-]{0,10}(\d{3,4})/i,
        /FIDE rating[:\s\-]{0,10}(\d{3,4})/i,
        /"standardRating"\s*[:=]\s*(\d{3,4})/i,
      ]
      for (const p of patterns) {
        const m = text.match(p)
        if (m) {
          currentRating = Number(m[1])
          break
        }
      }
    }

    // If still not found, fallback to plausible numeric heuristics
    if (!currentRating) {
      const nums = Array.from(text.matchAll(/(\d{3,4})/g)).map((r) => Number(r[1]))
      if (nums.length) {
        const candidates = nums.filter((n) => n >= 1000 && n <= 3000)
        if (candidates.length) {
          // pick the most recent numbers near the end of page first
          currentRating = candidates[candidates.length - 1]
        }
      }
    }

    // Try both JS chart parsing and table extraction, prefer table data when available
    let ratingHistory: { year: number; rating: number }[] | undefined = undefined
    let parsedHistory: { year: number; rating: number }[] | undefined = undefined
    try {
      const parsed = _parseFideJSRatingHistory(text as any)
      if (parsed && parsed.length) {
        const valid = parsed.filter((p) => typeof p.year === 'number' && typeof p.rating === 'number' && p.year >= 2000 && p.year <= new Date().getFullYear() && p.rating >= 800 && p.rating <= 3000)
        if (valid.length) parsedHistory = valid
      }
    } catch (e) {
      parsedHistory = undefined
    }

    // use dedicated helper to parse any table-based history entries
    let tableHistory = _parseFideTableHistory(text as any) || []

    if (tableHistory.length) {
      const map = new Map<number, number>()
      if (parsedHistory) {
        for (const h of parsedHistory) map.set(h.year, h.rating)
      }
      for (const h of tableHistory) map.set(h.year, h.rating)
      const years = Array.from(map.keys()).sort((a, b) => a - b)
      ratingHistory = years.map((y) => ({ year: y, rating: map.get(y)! }))
    } else if (parsedHistory && parsedHistory.length) {
      ratingHistory = parsedHistory
    }

    // If we have parsed history, prefer it for currentRating only when we don't already have a reliable extraction
    if ((!currentRating || currentRating < 800 || currentRating > 3000) && ratingHistory && ratingHistory.length) {
      currentRating = ratingHistory[ratingHistory.length - 1].rating
    }

    // (ratingHistory is set above either by JS parser or regex fallback)

    // attempt to detect peak rating mentioned explicitly
    let peakRating: number | null = null
    let peakDate: string | null = null
    const peakPatterns = [/(Peak|Highest|Top)[^\d]{0,40}(\d{3,4})/i, /Highest rating[:\s\-]{0,10}(\d{3,4})/i, /Peak rating[:\s\-]{0,10}(\d{3,4})/i]
    for (const p of peakPatterns) {
      const m = text.match(p)
      if (m) {
        peakRating = Number(m[m.length - 1])
        // ignore implausible peak values
        if (peakRating < 800 || peakRating > 3000) peakRating = null
        break
      }
    }

    // Ensure we have a rating history covering recent years (prefer last 10)
    // normalize history to last 10 years and derive peak
    const normalized = _normalizeHistory(ratingHistory || generateHistoryFromRating(currentRating || 1600, 10), 10)
    const peak = _derivePeakFromHistory(normalized)
    if (!peakRating && peak.peakRating) peakRating = peak.peakRating
    if (!peakDate && peak.peakYear) peakDate = `${peak.peakYear}`

    // additional heuristic: if the page contains a numeric candidate much larger than histMax,
    // it may indicate the true peak (some tables mention peak separately). Use it if significantly higher.
    const histMax = normalized.length ? Math.max(...normalized.map((r: any) => r.rating)) : 0
    try {
      // look for numeric candidates that have a nearby year (table row like '2025-Jul ... 2243')
      for (const m of text.matchAll(/(\d{3,4})/g)) {
        const num = Number(m[1])
        if (num < 800 || num > 3000) continue
        const idx = m.index || 0
        const window = text.slice(Math.max(0, idx - 120), idx + 20)
        const yMatch = window.match(/(20\d{2})/)
        if (yMatch) {
          const year = Number(yMatch[1])
          if (num > histMax + 20 && year >= 2000 && year <= new Date().getFullYear()) {
            peakRating = num
            peakDate = `${year}`
            break
          }
        }
      }
    } catch (e) {
      // ignore
    }

    const out: any = { name, currentRating, ratingHistory: normalized, peakRating, peakDate }
    if (debug) out._debug = { samplePage: text.slice(0, 2000) }
    return out
  } catch (e) {
    return null
  }
}

function generateHistoryFromRating(currentRating: number, yearsCount = 4) {
  const history = [] as { year: number; rating: number }[]
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - (yearsCount - 1)
  let r = Math.max(1000, Math.min(3000, Math.round(currentRating)))
  for (let year = startYear; year <= currentYear; year++) {
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

function generateRandomHistory(yearsCount = 4) {
  const history: { year: number; rating: number }[] = []
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - (yearsCount - 1)
  let rating = 1400 + Math.floor(Math.random() * 400)
  for (let year = startYear; year <= currentYear; year++) {
    const change = (Math.random() - 0.5) * 200
    rating = Math.max(1000, Math.min(3000, rating + change))
    history.push({ year, rating: Math.round(rating) })
  }
  return history
}
