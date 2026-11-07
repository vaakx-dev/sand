import { all, answered, type LocalTask } from '../task'
import { layout, shuffled } from './layout'

const days = 30
const peak = 1500 + Math.floor(Math.random() * 200)
const gaps = [0, 0.004, 0.011, 0.017].map(gap => (gap ? Math.round(peak * (gap + Math.random() * 0.004)) : 0))
const top = shuffled(Array.from({ length: days - 10 }, (_, index) => index + 9)).slice(0, gaps.length)

const signups = Array.from({ length: days }, (_, index) => {
  const rank = top.indexOf(index)
  return rank >= 0 ? peak - (gaps[rank] ?? 0) : Math.round(peak * (0.35 + Math.random() * 0.5))
})

const [best = 0] = top
const total = signups.reduce((sum, value) => sum + value, 0)

const script = `const values = ${JSON.stringify(signups)}
const canvas = document.getElementById('chart')
const context = canvas.getContext('2d')
const plot = { left: 64, right: 16, top: 24, bottom: 44 }
const width = canvas.width - plot.left - plot.right
const height = canvas.height - plot.top - plot.bottom
const ceiling = 2000
const slot = width / values.length
const y = value => plot.top + height - (value / ceiling) * height
const label = index => new Date(2026, 5, index + 1).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

const draw = hovered => {
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.font = '12px system-ui, sans-serif'
  context.textBaseline = 'middle'
  context.strokeStyle = '#e1e4ea'
  context.fillStyle = '#6b7280'
  context.textAlign = 'right'
  for (let value = 0; value <= ceiling; value += 500) {
    context.beginPath(); context.moveTo(plot.left, y(value)); context.lineTo(plot.left + width, y(value)); context.stroke()
    context.fillText(String(value), plot.left - 8, y(value))
  }
  context.textAlign = 'center'
  context.textBaseline = 'top'
  values.forEach((value, index) => {
    context.fillStyle = index === hovered ? '#1d4ed8' : '#6d9eeb'
    context.fillRect(plot.left + index * slot + 4, y(value), slot - 8, plot.top + height - y(value))
    if ([0, 4, 9, 14, 19, 24, 29].includes(index)) { context.fillStyle = '#6b7280'; context.fillText('Jun ' + (index + 1), plot.left + (index + 0.5) * slot, plot.top + height + 10) }
  })
  if (hovered === undefined) return
  const text = label(hovered) + ': ' + values[hovered].toLocaleString('en-US') + ' signups'
  context.font = '13px system-ui, sans-serif'
  const box = context.measureText(text).width + 20
  const left = Math.min(plot.left + (hovered + 0.5) * slot - box / 2, canvas.width - box - 4)
  const base = Math.max(y(values[hovered]) - 44, 4)
  context.fillStyle = '#111827'
  context.fillRect(Math.max(left, 4), base, box, 28)
  context.fillStyle = '#fff'
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  context.fillText(text, Math.max(left, 4) + 10, base + 14)
}

canvas.onmousemove = event => {
  const rect = canvas.getBoundingClientRect()
  const index = Math.floor((event.clientX - rect.left - plot.left) / slot)
  draw(index >= 0 && index < values.length ? index : undefined)
}
canvas.onmouseleave = () => draw(undefined)
draw(undefined)`

const page = layout(
  'Analytics',
  `<style>.kpis { display: flex; gap: 16px; margin-bottom: 16px; } .kpis .card { flex: 1; } .kpis b { font-size: 26px; display: block; } canvas { display: block; }</style>
<header><b>Pulse Analytics</b><span>Overview</span><span>Acquisition</span><span>Retention</span></header>
<main style="max-width:1040px"><h1>Acquisition</h1>
<div class="kpis"><div class="card"><span>Signups, last 30 days</span><b>${(Math.round(total / 100) / 10).toFixed(1)}k</b></div><div class="card"><span>Conversion</span><b>3.8%</b></div><div class="card"><span>Bounce rate</span><b>41%</b></div></div>
<div class="card"><h2 style="margin:0 0 8px">Daily signups</h2><canvas id="chart" width="980" height="330" aria-label="Daily signups, 1 to 30 June"></canvas></div></main>`,
  script,
)

const day = best + 1

export const canvasChart: LocalTask = {
  id: 'canvas-chart',
  set: 'browser',
  place: 'local',
  kind: 'embedded',
  prompt: site => `Open the analytics page at ${site}/canvas-chart/. In the daily signups chart, find the day with the most signups and reply with that day and its exact signup count.`,
  check: seen =>
    all(answered(seen, `Jun ${day}`, `June ${day}`, `${day} Jun`, `${day} June`), answered(seen, String(peak))),
  page: path => (path === '/' ? page : undefined),
}
