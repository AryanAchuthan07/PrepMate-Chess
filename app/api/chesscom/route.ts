import { NextRequest, NextResponse } from 'next/server'

const cache = new Map<string, { data: unknown; timestamp: number }>()
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

const drawResults = new Set([
  'agreed',
  'repetition',
  'stalemate',
  'insufficient',
  '50move',
  'threefold',
  'timevsinsufficient',
])

export async function POST(request: NextRequest) {
  const body = await request.json()
  const raw = body?.username
  const username = typeof raw === 'string' ? raw.trim().toLowerCase() : ''

  if (!username) {
    return NextResponse.json({ error: 'Invalid Chess.com username' }, { status: 400 })
  }

  const cached = cache.get(username)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data)
  }

  try {
    const profileRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}`)
    if (!profileRes.ok) {
      return NextResponse.json({ error: 'Chess.com profile not found' }, { status: 404 })
    }
    const profile = await profileRes.json()

    const archivesRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`)
    if (!archivesRes.ok) {
      return NextResponse.json({ error: 'Unable to fetch game archives' }, { status: 502 })
    }
    const archivesData = await archivesRes.json()
    const archives: string[] = Array.isArray(archivesData?.archives) ? archivesData.archives : []

    const recentArchives = archives.slice(-3)
    const games: any[] = []

    for (const url of recentArchives) {
      try {
        const res = await fetch(url)
        if (!res.ok) continue
        const data = await res.json()
        if (Array.isArray(data?.games)) {
          games.push(...data.games)
        }
      } catch {
        // ignore archive errors
      }
    }

    const openingsByColor = {
      white: new Map<string, number>(),
      black: new Map<string, number>(),
    }

    let wins = 0
    let losses = 0
    let draws = 0
    let highestRatedWin: { opponent: string; rating: number; url?: string } | null = null

    for (const game of games) {
      if (!game?.white || !game?.black) continue

      const whiteUser = String(game.white.username || '').toLowerCase() === username
      const blackUser = String(game.black.username || '').toLowerCase() === username

      if (!whiteUser && !blackUser) continue

      const userColor = whiteUser ? 'white' : 'black'
      const user = game[userColor]
      const opponent = game[whiteUser ? 'black' : 'white']

      if (user?.result === 'win') {
        wins += 1
        if (opponent?.rating && (!highestRatedWin || opponent.rating > highestRatedWin.rating)) {
          highestRatedWin = {
            opponent: String(opponent.username || 'Opponent'),
            rating: Number(opponent.rating),
            url: game.url,
          }
        }
      } else if (drawResults.has(user?.result)) {
        draws += 1
      } else {
        losses += 1
      }

      const pgn = String(game.pgn || '')
      const openingMatch = pgn.match(/\[Opening\s+"([^"]+)"\]/)
      const variationMatch = pgn.match(/\[Variation\s+"([^"]+)"\]/)
      const openingName = openingMatch?.[1] || variationMatch?.[1] || null

      if (openingName) {
        const map = openingsByColor[userColor as 'white' | 'black']
        map.set(openingName, (map.get(openingName) || 0) + 1)
      }
    }

    const toTopList = (map: Map<string, number>) =>
      Array.from(map.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))

    const analysis = {
      username,
      profile: {
        name: profile?.name,
        title: profile?.title,
        country: profile?.country,
        followers: profile?.followers,
        lastOnline: profile?.last_online,
      },
      stats: {
        totalGames: wins + losses + draws,
        wins,
        losses,
        draws,
        highestRatedWin: highestRatedWin || undefined,
      },
      openings: {
        white: toTopList(openingsByColor.white),
        black: toTopList(openingsByColor.black),
      },
      recentGamesAnalyzed: wins + losses + draws,
    }

    const data = { success: true, analysis }
    cache.set(username, { data, timestamp: Date.now() })
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch Chess.com data' }, { status: 500 })
  }
}
