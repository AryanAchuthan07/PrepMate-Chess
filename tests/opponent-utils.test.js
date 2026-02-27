const assert = require('assert')
const { parseFideJSRatingHistory, parseFideTableHistory, normalizeHistory, derivePeakFromHistory } = require('../lib/opponent-utils')

function testParse() {
  const html = `
    <script>
      Highcharts.chart('container', {
        xAxis: { categories: ['2016','2017','2018','2019'] },
        series: [{ name: 'Standard', data: [1800, 1850, 1900, 1950] }]
      })
    </script>
  `
  const parsed = parseFideJSRatingHistory(html)
  assert(parsed && parsed.length === 4, 'parsed length')
  assert(parsed[0].year === 2016 && parsed[0].rating === 1800)
  console.log('parseFideJSRatingHistory: ok')
}

function testTableParsing() {
  // simulate a snippet containing a table row with year-month and rating
  const html = `
    <table>
      <tr><td>2025-Jul</td><td>2243</td></tr>
      <tr><td>2025-Aug</td><td>2205</td></tr>
    </table>
  `
  const parsed = parseFideTableHistory(html)
  assert(parsed && Array.isArray(parsed), 'should return array')
  // should have one entry per year (2025), keeping highest occurrence which is 2243
  assert(parsed.length === 1, 'parsed one unique year')
  assert(parsed[0].year === 2025 && parsed[0].rating === 2243, 'keeps highest 2243')
  console.log('parseFideTableHistory: ok')
}

function testNormalizeAndPeak() {
  const thisYear = new Date().getFullYear()
  const history = []
  for (let y = thisYear - 12; y <= thisYear; y++) {
    history.push({ year: y, rating: 1500 + (y - (thisYear - 12)) * 10 })
  }
  const norm = normalizeHistory(history, 10)
  assert(norm.length === 10, 'normalized length 10')
  assert(norm[0].year >= thisYear - 9, 'starts within last 10 years')

  const peak = derivePeakFromHistory(norm)
  const expectedPeak = Math.max(...norm.map((h) => h.rating))
  assert(peak.peakRating === expectedPeak, 'peak rating matched')
  console.log('normalizeHistory & derivePeakFromHistory: ok')
}

function run() {
  testParse()
  testTableParsing()
  testNormalizeAndPeak()
  console.log('ALL TESTS PASSED')
}

run()
