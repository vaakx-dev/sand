import { calm, isPhone, seeded, type Pen, type Scene } from './draw'

const sunCache = new Map<number, OffscreenCanvas>()

const sunDisc = (radius: number, t: number) => {
  const scale = 2
  const pad = 80
  const width = radius * 2 + pad * 2
  const height = radius + pad
  const layer = sunCache.get(radius) ?? new OffscreenCanvas(width * scale, height * scale)
  sunCache.set(radius, layer)
  const g = layer.getContext('2d')
  if (!g) return { layer, width, height, ox: radius + pad, oy: radius + pad }
  const ox = radius + pad
  const oy = radius + pad
  g.setTransform(scale, 0, 0, scale, 0, 0)
  g.clearRect(0, 0, width, height)
  g.globalCompositeOperation = 'source-over'
  const fill = g.createLinearGradient(0, oy - radius, 0, oy)
  fill.addColorStop(0, '#ffe27a')
  fill.addColorStop(0.55, '#ff8a5b')
  fill.addColorStop(1, '#ff3d8b')
  g.shadowColor = 'rgba(255,90,140,.55)'
  g.shadowBlur = 50
  g.fillStyle = fill
  g.beginPath()
  g.arc(ox, oy, radius, Math.PI, 0)
  g.fill()
  g.shadowBlur = 0
  g.globalCompositeOperation = 'destination-out'
  const gap = radius / 7
  const shift = (t * 6) % gap
  for (let y = oy - radius * 0.55 + shift; y < oy; y += gap) {
    const k = (y - (oy - radius * 0.6)) / (radius * 0.6)
    g.fillRect(ox - radius - 2, y, radius * 2 + 4, 1 + k * gap * 0.45)
  }
  g.globalCompositeOperation = 'source-over'
  return { layer, width, height, ox, oy }
}

const ridge = (g: Pen, w: number, horizon: number, seed: number, amplitude: number, color: string) => {
  const next = seeded(seed)
  g.fillStyle = color
  g.beginPath()
  g.moveTo(0, horizon)
  for (let x = 0; x <= w; x += 30 + next() * 60) g.lineTo(x, horizon - next() * amplitude)
  g.lineTo(w, horizon)
  g.closePath()
  g.fill()
}

export const sunset: Scene = (g, w, h, t, { neutral, accent }) => {
  const phone = isPhone(w)
  const horizon = phone ? h - 128 : h * 0.8
  const sky = g.createLinearGradient(0, 0, 0, horizon)
  sky.addColorStop(0, neutral['900']!)
  sky.addColorStop(0.45, '#2a1450')
  sky.addColorStop(0.8, '#6b1f6e')
  sky.addColorStop(1, '#c2366e')
  g.fillStyle = sky
  g.fillRect(0, 0, w, horizon)

  const next = seeded(5)
  for (let i = 0; i < (phone ? 70 : 160); i++) {
    const x = next() * w
    const y = next() * horizon * 0.6
    const twinkle = 0.5 + 0.5 * Math.sin(t * (0.5 + next()) + next() * 6)
    const size = next() < 0.15 ? 2 : 1
    g.fillStyle = `rgba(255,220,250,${0.25 + 0.6 * twinkle})`
    g.fillRect(Math.round(x), Math.round(y), size, size)
  }

  const sunX = phone ? w * 0.5 : w - 190
  const sun = sunDisc(phone ? 84 : 150, t)
  g.drawImage(sun.layer, sunX - sun.ox, horizon - sun.oy, sun.width, sun.height)
  ridge(g, w, horizon, 2, phone ? 26 : 50, '#3a1458')
  ridge(g, w, horizon, 9, phone ? 14 : 26, '#24103f')

  const floor = g.createLinearGradient(0, horizon, 0, h)
  floor.addColorStop(0, '#1d0b33')
  floor.addColorStop(1, neutral['900']!)
  g.fillStyle = floor
  g.fillRect(0, horizon, w, h - horizon)

  g.save()
  g.beginPath()
  g.rect(0, horizon, w, h - horizon)
  g.clip()
  g.strokeStyle = accent['500']!
  g.shadowColor = accent['500']!
  g.shadowBlur = 8
  g.globalAlpha = 0.55
  g.lineWidth = 1
  for (let i = -24; i <= 24; i++) {
    g.beginPath()
    g.moveTo(sunX + i * 6, horizon)
    g.lineTo(sunX + i * (phone ? 70 : 130), h + 40)
    g.stroke()
  }
  const phase = (t * 0.35) % 1
  for (let k = 0; k < 18; k++) {
    const y = horizon + (h - horizon) * Math.min(1.2, (1 / (k + 1 - phase + 0.0001)) * 0.18)
    if (y > h + 2) continue
    g.globalAlpha = Math.min(0.8, 0.15 + (y - horizon) / (h - horizon))
    g.lineWidth = 1 + (y - horizon) / 90
    g.beginPath()
    g.moveTo(0, y)
    g.lineTo(w, y)
    g.stroke()
  }
  g.restore()

  const glow = g.createLinearGradient(0, horizon - 3, 0, horizon + 3)
  glow.addColorStop(0, 'rgba(255,120,170,0)')
  glow.addColorStop(0.5, 'rgba(255,150,190,.9)')
  glow.addColorStop(1, 'rgba(255,120,170,0)')
  g.fillStyle = glow
  g.fillRect(0, horizon - 3, w, 6)
  calm(g, w, h, neutral['900']!, 0.62)
}
