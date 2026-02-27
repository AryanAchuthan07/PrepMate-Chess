// Utility helpers for opponent rating parsing and normalization
function parseFideJSRatingHistory(html) {
  if (!html) return null

  // Try to find JS chart data patterns commonly used on FIDE pages
  // e.g. categories: ['2016','2017',...], series: [{name:'Standard',data:[...]}]
  try {
    const yearsMatch = html.match(/categories\s*:\s*\[([^\]]+)\]/i)
    // series may contain nested arrays/objects; use a more tolerant pattern when looking for the Standard series data
    const stdSeriesMatch = html.match(/series[\s\S]*?name\s*:\s*['"]?Standard['"]?[\s\S]*?data\s*:\s*\[([^\]]+)\]/i)

    let years = null
    if (yearsMatch) {
      const raw = yearsMatch[1]
      years = Array.from(raw.matchAll(/(['"]?)(20\d{2})\1/g)).map((m) => Number(m[2]))
    }

    // Try to find series entries and prefer 'Standard' or 'Classical' series
    let data = null
    if (stdSeriesMatch) {
      const dataRaw = stdSeriesMatch[1]
      if (dataRaw) {
        data = Array.from(dataRaw.matchAll(/(\d{2,4})/g)).map((m) => Number(m[1]))
      }
    }

    // If still not found, extract all series objects and pick the one matching 'standard' or with highest average
    if (!data) {
      const seriesBlockMatch = html.match(/series\s*:\s*\[([\s\S]*?)\]\s*,/i)
      if (seriesBlockMatch) {
        const seriesText = seriesBlockMatch[1]
        const objMatches = Array.from(seriesText.matchAll(/\{([\s\S]*?)\}/g)).map(m => m[1])
        const candidates = []
        for (const obj of objMatches) {
          const nameMatch = obj.match(/name\s*:\s*['"]([^'"]+)['"]/i)
          const dataMatch = obj.match(/data\s*:\s*\[([^\]]+)\]/i)
          if (dataMatch) {
            const arr = Array.from(dataMatch[1].matchAll(/(\d{2,4})/g)).map(m => Number(m[1]))
            const avg = arr.length ? arr.reduce((s,a) => s+a,0)/arr.length : 0
            candidates.push({ name: nameMatch ? nameMatch[1] : '', data: arr, avg })
          }
        }

        // prefer series with 'standard' or 'classical' in name
        const pref = candidates.find(c => /standard|classical/i.test(c.name))
        if (pref) data = pref.data
        else if (candidates.length) {
          // fallback to highest average series
          candidates.sort((a,b) => b.avg - a.avg)
          data = candidates[0].data
        }
      }
    }

    // Fallback: look for standalone arrays like [2016,2017] and [2000,2100,...]
    if (!years) {
      const yearsArrMatch = html.match(/\[\s*(["']?20\d{2}["']?(?:\s*,\s*["']?20\d{2}["']?)*)\s*\]/)
      if (yearsArrMatch) {
        years = Array.from(yearsArrMatch[1].matchAll(/(20\d{2})/g)).map((m) => Number(m[1]))
      }
    }

    if (years && data && years.length === data.length) {
      return years.map((y, i) => ({ year: y, rating: data[i] }))
    }

    return null
  } catch (e) {
    return null
  }
}


function parseFideTableHistory(html) {
  if (!html) return null
  const tableHistory = []
  for (const rowMatch of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const row = rowMatch[1]
    const yearMatch = row.match(/(20\d{2})/)
    if (!yearMatch) continue
    const year = Number(yearMatch[1])
    if (year < 2000 || year > new Date().getFullYear()) continue

    const nums = Array.from(row.matchAll(/(\d{3,4})/g)).map((m) => Number(m[1]))
    let rating = null
    for (const n of nums) {
      if (n >= 800 && n <= 3000 && n !== year) {
        rating = n
        break
      }
    }
    if (rating) tableHistory.push({ year, rating })
  }
  if (tableHistory.length) {
    // For each year, keep the highest rating encountered
    const map = new Map()
    for (const h of tableHistory) {
      const existing = map.get(h.year)
      if (!existing || h.rating > existing) map.set(h.year, h.rating)
    }
    const years = Array.from(map.keys()).sort((a, b) => a - b)
    return years.map((y) => ({ year: y, rating: map.get(y) }))
  }
  return null
}

function normalizeHistory(history, years = 10) {
  if (!Array.isArray(history) || history.length === 0) return generateHistoryFromRating(1600, years)
  const currentYear = new Date().getFullYear()
  const minYear = currentYear - (years - 1)
  const filtered = history.filter((h) => h.year >= minYear)
  if (filtered.length) return filtered.slice(-years)
  // otherwise, if history shorter than years, pad using nearest values
  const sorted = history.slice().sort((a, b) => a.year - b.year)
  if (sorted.length >= years) return sorted.slice(-years)
  // pad
  const res = []
  const startYear = currentYear - (years - 1)
  for (let y = startYear; y <= currentYear; y++) {
    const found = sorted.find((s) => s.year === y)
    if (found) res.push(found)
    else {
      // use last known rating or 1600
      const last = res.length ? res[res.length - 1].rating : (sorted.length ? sorted[sorted.length - 1].rating : 1600)
      res.push({ year: y, rating: last })
    }
  }
  return res
}

function derivePeakFromHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return { peakRating: null, peakYear: null }
  let peak = history[0]
  for (const h of history) {
    if (h.rating > peak.rating) peak = h
  }
  return { peakRating: peak.rating, peakYear: peak.year }
}

function generateHistoryFromRating(currentRating, yearsCount = 4) {
  const history = []
  const currentYear = new Date().getFullYear()
  const startYear = currentYear - (yearsCount - 1)
  let r = Math.max(1000, Math.min(3000, Math.round(currentRating)))
  for (let year = startYear; year <= currentYear; year++) {
    const jitter = Math.round((Math.random() - 0.5) * 120)
    history.push({ year, rating: Math.max(1000, Math.min(3000, r + jitter)) })
  }
  return history
}

module.exports = { parseFideJSRatingHistory, parseFideTableHistory, normalizeHistory, derivePeakFromHistory, generateHistoryFromRating }
