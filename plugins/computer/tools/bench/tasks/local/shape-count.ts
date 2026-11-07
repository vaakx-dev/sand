import type { LocalTask } from '../task'
import { layout, pick, shuffled } from './layout'

const colors = { red: '#d62828', orange: '#f77f00', blue: '#2a6fdb', green: '#2a9d3f' }
const colorNames = ['red', 'orange', 'blue', 'green'] as const
const shapes = ['triangle', 'circle', 'square'] as const

const columns = 24
const rows = 10
const cell = 47

const between = (low: number, high: number) => low + Math.floor(Math.random() * (high - low + 1))

const wanted = { color: pick(['red', 'blue'] as const), shape: pick(shapes) }

const items = shuffled(Array.from({ length: columns * rows }, (_, index) => index))
  .slice(0, between(80, 100))
  .map(index => ({
    color: pick(colorNames),
    shape: pick(shapes),
    x: (index % columns) * cell + cell / 2 + between(-8, 8),
    y: Math.floor(index / columns) * cell + cell / 2 + between(-8, 8),
    size: between(9, 15),
    turn: Math.random() * Math.PI,
  }))

const count = items.filter(item => item.color === wanted.color && item.shape === wanted.shape).length

const page = layout(
  'Sorting line camera',
  `<header><b>Sorting line</b><span>Camera 3</span></header><main style="max-width:none"><h1>Bin snapshot</h1><p>Live frame from the sorting line camera.</p><canvas id="frame" width="1140" height="490" style="background:#f2efe6;border:1px solid #c9c3b3"></canvas></main>`,
  `const items = ${JSON.stringify(items)}
const colors = ${JSON.stringify(colors)}
const context = document.getElementById('frame').getContext('2d')
for (const { color, shape, x, y, size, turn } of items) {
  context.save()
  context.translate(x, y)
  context.rotate(turn)
  context.fillStyle = colors[color]
  context.strokeStyle = 'rgba(0,0,0,.35)'
  context.beginPath()
  if (shape === 'circle') context.arc(0, 0, size * 0.8, 0, Math.PI * 2)
  if (shape === 'square') context.rect(-size * 0.75, -size * 0.75, size * 1.5, size * 1.5)
  if (shape === 'triangle') { context.moveTo(0, -size); context.lineTo(size * 0.9, size * 0.7); context.lineTo(-size * 0.9, size * 0.7); context.closePath() }
  context.fill()
  context.stroke()
  context.restore()
}`,
)

export const shapeCount: LocalTask = {
  id: 'shape-count',
  set: 'browser',
  place: 'local',
  kind: 'embedded',
  prompt: site => `The camera frame at ${site}/shape-count/ shows parts on a sorting line. How many ${wanted.color} ${wanted.shape}s are in the frame? Reply with the number.`,
  check: ({ answer }) => {
    const numbers: string[] = answer.match(/\d+/g) ?? []
    return numbers.includes(String(count)) ? { pass: true, why: `counted ${count}` } : { pass: false, why: `wanted ${count}: "${answer.slice(0, 120)}"` }
  },
  page: path => (path === '/' ? page : undefined),
}
