import { calm, isPhone, rgba, type Pen, type Scene } from './draw'

const mono = 'ui-monospace, Consolas, monospace'

const grid = (g: Pen, w: number, h: number, ink: string) => {
  g.lineWidth = 1
  for (let x = 0.5; x < w; x += 12) {
    g.strokeStyle = rgba(ink, x % 60 < 1 ? 0.1 : 0.045)
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x, h)
    g.stroke()
  }
  for (let y = 0.5; y < h; y += 12) {
    g.strokeStyle = rgba(ink, y % 60 < 1 ? 0.1 : 0.045)
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(w, y)
    g.stroke()
  }
}

const drafting = (g: Pen, ink: string, unit: number) => {
  const line = (alpha: number) => {
    g.strokeStyle = rgba(ink, alpha)
    g.lineWidth = 1
  }
  const label = (text: string, x: number, y: number, alpha = 0.55, align: CanvasTextAlign = 'left') => {
    g.fillStyle = rgba(ink, alpha)
    g.font = `${10 * unit}px ${mono}`
    g.textAlign = align
    g.fillText(text, x, y)
  }
  const segment = (x1: number, y1: number, x2: number, y2: number) => {
    g.beginPath()
    g.moveTo(x1, y1)
    g.lineTo(x2, y2)
    g.stroke()
  }
  const arrow = (x1: number, y1: number, x2: number, y2: number) => {
    segment(x1, y1, x2, y2)
    for (const [ax, ay, bx, by] of [
      [x1, y1, x2, y2],
      [x2, y2, x1, y1],
    ] as const) {
      const angle = Math.atan2(by - ay, bx - ax)
      segment(ax, ay, ax + 7 * Math.cos(angle + 0.3), ay + 7 * Math.sin(angle + 0.3))
      segment(ax, ay, ax + 7 * Math.cos(angle - 0.3), ay + 7 * Math.sin(angle - 0.3))
    }
  }
  const circle = (x: number, y: number, r: number) => {
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.stroke()
  }
  return { line, label, segment, arrow, circle }
}

const gear = (g: Pen, ink: string, cx: number, cy: number, teeth: number, r: number, turn: number) => {
  const pen = drafting(g, ink, 1)
  const depth = r * 0.14
  const step = (Math.PI * 2) / teeth
  g.beginPath()
  for (let i = 0; i < teeth; i++) {
    const from = turn + i * step
    const points = [
      [r - depth, from],
      [r + depth * 0.2, from + step * 0.12],
      [r + depth, from + step * 0.25],
      [r + depth, from + step * 0.45],
      [r + depth * 0.2, from + step * 0.58],
      [r - depth, from + step * 0.7],
    ] as const
    points.forEach(([radius, angle], j) => {
      const x = cx + radius * Math.cos(angle)
      const y = cy + radius * Math.sin(angle)
      if (i === 0 && j === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    })
    g.arc(cx, cy, r - depth, from + step * 0.7, from + step)
  }
  g.closePath()
  g.stroke()
  pen.circle(cx, cy, r * 0.28)
  pen.circle(cx, cy, r * 0.12)
  for (let k = 0; k < 5; k++) {
    const angle = turn + (k / 5) * Math.PI * 2
    pen.circle(cx + r * 0.58 * Math.cos(angle), cy + r * 0.58 * Math.sin(angle), r * 0.13)
  }
  g.save()
  g.setLineDash([10, 4, 2, 4])
  g.strokeStyle = rgba(ink, 0.3)
  pen.circle(cx, cy, r)
  pen.segment(cx - r - 24, cy, cx + r + 24, cy)
  pen.segment(cx, cy - r - 24, cx, cy + r + 24)
  g.restore()
}

const bode = (g: Pen, ink: string, accent: string, x: number, y: number, w: number, h: number, t: number, unit: number) => {
  const pen = drafting(g, ink, unit)
  pen.line(0.4)
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x, y + h)
  g.lineTo(x + w, y + h)
  g.stroke()
  for (let decade = 0; decade <= 4; decade++) {
    const at = x + (decade / 4) * w
    g.strokeStyle = rgba(ink, 0.14)
    pen.segment(at, y, at, y + h)
    for (let s = 2; s < 10; s++) {
      const minor = at + (Math.log10(s) * w) / 4
      if (minor > x + w) break
      g.strokeStyle = rgba(ink, 0.06)
      pen.segment(minor, y, minor, y + h)
    }
    g.strokeStyle = rgba(ink, 0.14)
    pen.segment(x, y + (decade / 4) * h, x + w, y + (decade / 4) * h)
  }
  const corner = 0.42
  const response = (k: number) => -10 * Math.log10(1 + (10 ** ((k - corner) * 4)) ** 2)
  const yOf = (db: number) => Math.min(y + h, y + 12 + (-db / 40) * (h - 12))
  g.strokeStyle = rgba(ink, 0.75)
  g.lineWidth = 1.5
  g.beginPath()
  for (let i = 0; i <= 200; i++) {
    const k = i / 200
    if (i) g.lineTo(x + k * w, yOf(response(k)))
    else g.moveTo(x + k * w, yOf(response(k)))
  }
  g.stroke()
  g.lineWidth = 1
  g.fillStyle = accent
  g.beginPath()
  g.arc(x + corner * w, yOf(-3), 3.5, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = rgba(accent, 0.8)
  g.setLineDash([3, 3])
  pen.segment(x + corner * w, yOf(-3), x + corner * w, y + h)
  g.setLineDash([])
  const probe = (t * 0.03) % 1
  g.fillStyle = rgba(accent, 0.35)
  g.beginPath()
  g.arc(x + probe * w, yOf(response(probe)), 2.5, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = accent
  g.font = `${10 * unit}px ${mono}`
  g.textAlign = 'left'
  g.fillText('−3 dB  1.59 kHz', x + corner * w + 8, yOf(-3) - 6)
  pen.label('|H(f)| dB', x, y - 8)
  pen.label('100   1k   10k  100k', x, y + h + 14, 0.4)
}

const titleBlock = (g: Pen, ink: string, x: number, y: number) => {
  const pen = drafting(g, ink, 1)
  pen.line(0.38)
  g.strokeRect(x, y, 300, 84)
  pen.segment(x, y + 42, x + 300, y + 42)
  pen.segment(x + 180, y, x + 180, y + 84)
  pen.segment(x + 240, y + 42, x + 240, y + 84)
  pen.label('RC LOW-PASS · BENCH 3', x + 10, y + 26, 0.6)
  pen.label('DWG 0042', x + 190, y + 26, 0.5)
  pen.label('SCALE 1:1', x + 10, y + 68, 0.45)
  pen.label('SHT 1/1', x + 190, y + 68, 0.45)
  pen.label('REV B', x + 250, y + 68, 0.45)
}

const washer = (g: Pen, ink: string, cx: number, cy: number) => {
  const pen = drafting(g, ink, 1)
  pen.line(0.35)
  pen.circle(cx, cy, 70)
  pen.circle(cx, cy, 38)
  g.save()
  g.beginPath()
  g.arc(cx, cy, 70, 0, Math.PI * 2)
  g.arc(cx, cy, 38, 0, Math.PI * 2, true)
  g.clip('evenodd')
  g.strokeStyle = rgba(ink, 0.18)
  for (let k = -160; k < 160; k += 7) pen.segment(cx + k, cy - 80, cx + k + 160, cy + 80)
  g.restore()
  pen.line(0.4)
  pen.arrow(cx - 70, cy + 96, cx + 70, cy + 96)
  pen.label('Ø 140', cx, cy + 90, 0.5, 'center')
  pen.arrow(cx + 92, cy - 38, cx + 92, cy + 38)
  pen.label('Ø 76', cx + 98, cy + 4, 0.5)
}

export const blueprint: Scene = (g, w, h, t, { neutral, accent }) => {
  const ink = neutral['300']!
  g.fillStyle = neutral['900']!
  g.fillRect(0, 0, w, h)
  grid(g, w, h, ink)
  const phone = isPhone(w)
  const unit = phone ? 0.78 : 1
  const big = phone ? 96 : 150
  const small = big * (12 / 20)
  const gx = phone ? w - 40 : w - 110
  const gy = phone ? h - 66 : h - 80
  const spin = t * 0.12
  g.strokeStyle = rgba(ink, 0.42)
  g.lineWidth = 1
  gear(g, ink, gx, gy, 20, big, spin)
  gear(g, ink, gx - (big + small) * Math.cos(0.6), gy - (big + small) * Math.sin(0.6), 12, small, -spin * (20 / 12) + Math.PI / 12)
  const pen = drafting(g, ink, unit)
  pen.line(0.4)
  pen.arrow(gx - big, gy + big + 34, gx + big, gy + big + 34)
  pen.label('Ø 260  m 6  z 20', gx, gy + big + 28, 0.5, 'center')
  bode(g, ink, accent['400']!, phone ? w - 214 : w - 330, phone ? 22 : 70, phone ? 190 : 280, phone ? 92 : 150, t, unit)
  if (!phone) {
    titleBlock(g, ink, 300, h - 100)
    washer(g, ink, 400, 170)
  }
  calm(g, w, h, neutral['900']!, 0.8)
}
