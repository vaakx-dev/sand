import type { LocalTask, Seen, Verdict } from '../task'
import { layout, shuffled } from './layout'

const size = { width: 140, height: 60 }
const frame = { x: 940, y: 40, width: 280, height: 560 }

const names = shuffled(['Gateway', 'Auth', 'Billing', 'Orders', 'Search', 'Cache', 'Queue', 'Mailer', 'Reports', 'Storage', 'Webhooks', 'Ledger']).slice(0, 10)
const nameAt = (index: number) => names[index] ?? ''
const linkFrom = nameAt(0)
const linkTo = nameAt(1)
const backFrom = nameAt(2)
const backTo = nameAt(3)
const removed = nameAt(4)
const archived = nameAt(5)
const removedTo = nameAt(6)
const removedFrom = nameAt(7)
const removedToNext = nameAt(8)
const archivedFrom = nameAt(9)

const arrows = [
  { from: backTo, to: backFrom },
  { from: removed, to: removedTo },
  { from: removedFrom, to: removed },
  { from: removedTo, to: removedToNext },
  { from: archivedFrom, to: archived },
  { from: linkTo, to: archivedFrom },
]

const scatter = () =>
  shuffled(Array.from({ length: 12 }, (_, index) => ({ x: 50 + (index % 4) * 210, y: 60 + Math.floor(index / 4) * 190 })))
    .slice(0, names.length)
    .map(({ x, y }, index) => ({ name: nameAt(index), x, y }))

const unobstructed = (placed: ReturnType<typeof scatter>, from: string, to: string) => {
  const start = placed.find(box => box.name === from)!
  const end = placed.find(box => box.name === to)!
  return placed.every(box => {
    if (box === start || box === end) return true
    return Array.from({ length: 41 }, (_, step) => step / 40).every(t => {
      const x = start.x + (end.x - start.x) * t + size.width / 2
      const y = start.y + (end.y - start.y) * t + size.height / 2
      return x < box.x - 10 || x > box.x + size.width + 10 || y < box.y - 10 || y > box.y + size.height + 10
    })
  })
}

const boxes = (() => {
  for (;;) {
    const placed = scatter()
    if (arrows.every(arrow => unobstructed(placed, arrow.from, arrow.to))) return placed
  }
})()

const wantedArrows = [...arrows.filter(arrow => arrow.from !== removed && arrow.to !== removed), { from: linkFrom, to: linkTo }, { from: backFrom, to: backTo }].map(arrow => `${arrow.from}>${arrow.to}`).sort()

const page = layout(
  'Service map',
  `<style>
body { overflow: hidden; } header { height: 24px; } header span { font-size: 14px; opacity: .8; }
canvas { display: block; background: #fff; }
</style>
<header><b>Diagrams</b><span>Service map</span><span>Autosaved</span></header>
<canvas id="board" width="1240" height="640"></canvas>
<input type="hidden" name="boxes" value=""><input type="hidden" name="arrows" value="">`,
  `const size = ${JSON.stringify(size)}
const frame = ${JSON.stringify(frame)}
const boxes = ${JSON.stringify(boxes)}
let arrows = ${JSON.stringify(arrows)}
const canvas = document.getElementById('board')
const context = canvas.getContext('2d')
let selected
let hovered
let link
let drag
const fills = ['#e3efff', '#e6f6ea', '#fff1dc', '#f3e8fb', '#e2f5f5']
const byName = name => boxes.find(box => box.name === name)
const inside = (box, x, y, margin = 0) => x >= box.x - margin && x <= box.x + size.width + margin && y >= box.y - margin && y <= box.y + size.height + margin
const boxAt = (x, y, margin = 0) => boxes.findLast(box => inside(box, x, y, margin))
const handles = box => [[box.x + size.width / 2, box.y], [box.x + size.width, box.y + size.height / 2], [box.x + size.width / 2, box.y + size.height], [box.x, box.y + size.height / 2]]
const handleAt = (box, x, y) => handles(box).some(([hx, hy]) => Math.hypot(hx - x, hy - y) <= 9)
const segment = arrow => {
  const from = byName(arrow.from)
  const to = byName(arrow.to)
  const ax = from.x + size.width / 2
  const ay = from.y + size.height / 2
  const dx = to.x + size.width / 2 - ax
  const dy = to.y + size.height / 2 - ay
  const length = Math.hypot(dx, dy) || 1
  const at = t => ({ x: ax - dy / length * 8 + dx * t, y: ay + dx / length * 8 + dy * t })
  let low = 0
  let high = 1
  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2
    const point = at(mid)
    if (inside(from, point.x, point.y)) low = mid; else high = mid
  }
  const start = at(high)
  low = 0
  high = 1
  for (let step = 0; step < 24; step++) {
    const mid = (low + high) / 2
    const point = at(mid)
    if (inside(to, point.x, point.y)) high = mid; else low = mid
  }
  return { start, end: at(low) }
}
const distance = ({ start, end }, x, y) => {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const t = Math.max(0, Math.min(1, ((x - start.x) * dx + (y - start.y) * dy) / (dx * dx + dy * dy || 1)))
  return Math.hypot(start.x + dx * t - x, start.y + dy * t - y)
}
const arrowAt = (x, y) => arrows.findLast(arrow => distance(segment(arrow), x, y) <= 6)
const same = (arrow, other) => arrow && other && arrow.from === other.from && arrow.to === other.to
const sync = () => {
  document.querySelector('input[name=boxes]').value = boxes.map(box => box.name + ':' + Math.round(box.x) + ',' + Math.round(box.y)).sort().join('|')
  document.querySelector('input[name=arrows]').value = arrows.map(arrow => arrow.from + '>' + arrow.to).sort().join('|')
}
const drawArrow = (arrow, color, width) => {
  const { start, end } = segment(arrow)
  const angle = Math.atan2(end.y - start.y, end.x - start.x)
  context.strokeStyle = color
  context.fillStyle = color
  context.lineWidth = width
  context.setLineDash([])
  context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke()
  context.beginPath()
  context.moveTo(end.x, end.y)
  context.lineTo(end.x - 12 * Math.cos(angle - 0.4), end.y - 12 * Math.sin(angle - 0.4))
  context.lineTo(end.x - 12 * Math.cos(angle + 0.4), end.y - 12 * Math.sin(angle + 0.4))
  context.closePath(); context.fill()
}
const draw = () => {
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.setLineDash([8, 6])
  context.strokeStyle = '#8a94a6'
  context.lineWidth = 2
  context.strokeRect(frame.x, frame.y, frame.width, frame.height)
  context.setLineDash([])
  context.fillStyle = '#6b7280'
  context.font = '600 14px system-ui, sans-serif'
  context.textAlign = 'left'
  context.textBaseline = 'alphabetic'
  context.fillText('Archive', frame.x + 12, frame.y + 24)
  arrows.forEach(arrow => drawArrow(arrow, same(arrow, selected) ? '#2155c4' : '#4b5563', same(arrow, selected) ? 3.5 : 1.8))
  boxes.forEach((box, index) => {
    context.fillStyle = fills[index % fills.length]
    context.strokeStyle = selected === box ? '#2155c4' : link?.target === box ? '#2a9d3f' : '#6b7280'
    context.lineWidth = selected === box || link?.target === box ? 3 : 1.5
    context.beginPath(); context.roundRect(box.x, box.y, size.width, size.height, 8); context.fill(); context.stroke()
    context.fillStyle = '#1d2330'
    context.font = '15px system-ui, sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(box.name, box.x + size.width / 2, box.y + size.height / 2)
  })
  if (hovered && !drag) {
    context.lineWidth = 2
    context.strokeStyle = '#2155c4'
    context.fillStyle = '#fff'
    handles(hovered).forEach(([x, y]) => { context.beginPath(); context.arc(x, y, 6, 0, Math.PI * 2); context.fill(); context.stroke() })
  }
  if (link) {
    context.setLineDash([5, 5])
    context.strokeStyle = '#2155c4'
    context.lineWidth = 2
    context.beginPath(); context.moveTo(link.x, link.y); context.lineTo(link.at.x, link.at.y); context.stroke()
    context.setLineDash([])
  }
}
const point = event => {
  const rect = canvas.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}
canvas.addEventListener('mousedown', event => {
  if (event.button !== 0) return
  const { x, y } = point(event)
  const near = boxAt(x, y, 10)
  hovered = near
  if (near && handleAt(near, x, y)) {
    const [hx, hy] = handles(near).find(([px, py]) => Math.hypot(px - x, py - y) <= 9)
    link = { from: near, x: hx, y: hy, at: { x, y } }
    selected = undefined
  } else if (boxAt(x, y)) {
    const box = boxAt(x, y)
    selected = box
    drag = { box, grabX: x - box.x, grabY: y - box.y, startX: x, startY: y, moved: false }
    boxes.push(boxes.splice(boxes.indexOf(box), 1)[0])
  } else {
    selected = arrowAt(x, y)
  }
  draw()
})
canvas.addEventListener('mousemove', event => {
  const { x, y } = point(event)
  if (link) {
    link.at = { x, y }
    link.target = boxAt(x, y) !== link.from ? boxAt(x, y) : undefined
  } else if (drag) {
    if (!drag.moved && Math.hypot(x - drag.startX, y - drag.startY) < 4) return
    drag.moved = true
    drag.box.x = Math.max(0, Math.min(canvas.width - size.width, x - drag.grabX))
    drag.box.y = Math.max(0, Math.min(canvas.height - size.height, y - drag.grabY))
    sync()
  } else {
    hovered = boxAt(x, y, 10)
  }
  draw()
})
canvas.addEventListener('mouseleave', () => { if (!link && !drag) { hovered = undefined; draw() } })
document.addEventListener('mouseup', event => {
  if (link) {
    const { x, y } = point(event)
    const target = boxAt(x, y)
    const arrow = target && target !== link.from ? { from: link.from.name, to: target.name } : undefined
    if (arrow && !arrows.some(other => same(other, arrow))) arrows.push(arrow)
  }
  link = undefined
  drag = undefined
  sync()
  draw()
})
document.addEventListener('keydown', event => {
  if (event.key !== 'Delete' && event.key !== 'Backspace') return
  if (boxes.includes(selected)) {
    arrows = arrows.filter(arrow => arrow.from !== selected.name && arrow.to !== selected.name)
    boxes.splice(boxes.indexOf(selected), 1)
  } else if (selected) {
    arrows = arrows.filter(arrow => !same(arrow, selected))
  }
  selected = undefined
  sync()
  draw()
})
sync()
draw()`,
)

const edited = ({ tabs }: Seen): Verdict => {
  const tab = tabs.find(tab => /\/canvas-editor\/$/.test(tab.url))
  if (!tab) return { pass: false, why: 'the editor is not open' }
  const drawn = String(tab.fields.arrows ?? '')
  if (drawn !== wantedArrows.join('|')) return { pass: false, why: `arrows are ${drawn}, wanted ${wantedArrows.join('|')}` }
  const positions = new Map<string, number[]>()
  for (const entry of String(tab.fields.boxes ?? '').split('|')) {
    const [name = '', at = ''] = entry.split(':')
    positions.set(name, at.split(',').map(Number))
  }
  const missing = boxes.filter(box => box.name !== removed && !positions.has(box.name))
  if (missing.length || positions.has(removed) || positions.size !== boxes.length - 1) return { pass: false, why: `boxes left: ${[...positions.keys()].join(', ')}` }
  const inFrame = (name: string) => {
    const [x = 0, y = 0] = positions.get(name) ?? []
    return x >= frame.x && y >= frame.y && x + size.width <= frame.x + frame.width && y + size.height <= frame.y + frame.height
  }
  if (!inFrame(archived)) return { pass: false, why: `${archived} is not inside the Archive frame` }
  const shifted = boxes.filter(box => {
    const [x = 0, y = 0] = positions.get(box.name) ?? []
    return box.name !== removed && box.name !== archived && (Math.abs(x - box.x) > 12 || Math.abs(y - box.y) > 12)
  })
  return shifted.length ? { pass: false, why: `moved: ${shifted.map(box => box.name).join(', ')}` } : { pass: true, why: 'diagram edited as asked' }
}

export const canvasEditor: LocalTask = {
  id: 'canvas-editor',
  set: 'browser',
  place: 'local',
  kind: 'embedded',
  prompt: site =>
    `Open the diagram editor at ${site}/canvas-editor/. Draw an arrow from the box "${linkFrom}" to the box "${linkTo}", and another arrow from "${backFrom}" to "${backTo}" (direction matters: the arrowhead must point at the second box). Delete the box "${removed}" together with its arrows, and move the box "${archived}" completely inside the dashed "Archive" frame. Leave everything else as it is. The diagram is drawn on a canvas: hovering a box shows small connect handles on its edges, dragging from a handle onto another box draws an arrow, clicking a box or an arrow selects it, the Delete key removes the selection and boxes can be dragged.`,
  check: edited,
  page: path => (path === '/' ? page : undefined),
}
