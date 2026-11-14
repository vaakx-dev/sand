import { calmness, columnOf, isPhone, rgba, smooth, type Pen, type Scene } from './draw'

type Field = (x: number, y: number) => number

interface Screen {
  field: Field
  color: string
  angle: number
  cell: number
  offset: number
  alpha: number
}

const dots = (g: Pen, w: number, h: number, calmAt: Field, { field, color, angle, cell, offset, alpha }: Screen) => {
  g.fillStyle = rgba(color, alpha)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const reach = Math.hypot(w, h)
  for (let u = -reach; u < reach; u += cell)
    for (let v = -reach; v < reach; v += cell) {
      const x = w / 2 + u * cos - v * sin + offset
      const y = h / 2 + u * sin + v * cos + offset
      if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue
      const strength = field(x, y) * (0.08 + 0.92 * calmAt(x, y))
      if (strength < 0.04) continue
      g.beginPath()
      g.arc(x, y, (cell / 2) * 1.05 * Math.sqrt(strength), 0, Math.PI * 2)
      g.fill()
    }
}

export const halftone: Scene = (g, w, h, t, { neutral, accent }, mode) => {
  const dark = mode === 'dark'
  g.fillStyle = neutral['900']!
  g.fillRect(0, 0, w, h)
  const phone = isPhone(w)
  const column = columnOf(w, h)
  const sunX = phone ? w * 0.84 : w - 120
  const sunY = phone ? 46 : 120
  const sunR = phone ? 130 : 210
  const sun: Field = (x, y) => 1 - smooth(sunR * 0.55, sunR * 1.25, Math.hypot(x - sunX, y - sunY))
  const tide: Field = (x, y) => {
    const down = y / h
    const wave = 0.045 * Math.sin(x / (phone ? 70 : 140) + t * 0.35) + 0.03 * Math.sin(x / 47 - t * 0.22)
    const band = smooth(phone ? 0.74 : 0.6, 1, down + wave)
    const corner = 1 - smooth(0, phone ? 230 : 420, Math.hypot(x - (phone ? 0 : column.side), y - h))
    const left = phone ? 0 : 1 - smooth(column.side, column.side + 260, x)
    return Math.min(1, band * 0.95 + corner * 0.5 + left * smooth(0.25, 1, down) * 0.6)
  }
  const calmAt: Field = (x, y) => calmness(column, x, y)
  const cell = phone ? 7 : 9
  g.globalCompositeOperation = dark ? 'screen' : 'multiply'
  dots(g, w, h, calmAt, { field: sun, color: dark ? '#ff6f91' : '#ff5c86', angle: (75 * Math.PI) / 180, cell, offset: 1.5, alpha: dark ? 0.55 : 0.6 })
  dots(g, w, h, calmAt, { field: tide, color: accent['500']!, angle: (15 * Math.PI) / 180, cell, offset: 0, alpha: dark ? 0.6 : 0.55 })
  g.globalCompositeOperation = 'source-over'
}
