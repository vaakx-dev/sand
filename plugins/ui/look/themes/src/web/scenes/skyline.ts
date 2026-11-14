import { bayer, calm, columnOf, isPhone, rgbOf, seeded, type Scene } from './draw'

type Rgb = readonly [number, number, number]

const bands: Rgb[] = ['#0a0d1f', '#0f1430', '#171c44', '#22245a', '#33286a', '#4a2f72'].map(rgbOf)

const starLight: Rgb = [230, 230, 255]
const starDim: Rgb = [140, 145, 200]
const starRay: Rgb = [120, 125, 190]
const moonLit: Rgb = [238, 232, 210]
const moonDark: Rgb = [70, 64, 110]
const moonCrater: Rgb = [205, 198, 178]
const far: Rgb = [31, 27, 66]
const near: Rgb = [16, 14, 38]

const craters = new Set(['2,-3', '3,-3', '-1,4', '5,3'])

export const skyline: Scene = (g, w, h, t, { accent }) => {
  const phone = isPhone(w)
  const px = phone ? 3 : 4
  const cols = Math.ceil(w / px)
  const rows = Math.ceil(h / px)
  const layer = new OffscreenCanvas(cols, rows)
  const pen = layer.getContext('2d')
  if (!pen) return
  const image = pen.createImageData(cols, rows)
  const horizon = Math.floor(rows * (phone ? 0.935 : 0.88))
  const put = (x: number, y: number, [r, gg, b]: Rgb) => {
    if (x < 0 || y < 0 || x >= cols || y >= rows) return
    const i = (y * cols + x) * 4
    image.data[i] = r
    image.data[i + 1] = gg
    image.data[i + 2] = b
    image.data[i + 3] = 255
  }

  for (let y = 0; y < rows; y++) {
    const k = Math.pow(Math.min(1, y / horizon), 1.6) * (bands.length - 1)
    const low = Math.floor(k)
    for (let x = 0; x < cols; x++) put(x, y, k - low > bayer[(y % 4) * 4 + (x % 4)]! ? bands[Math.min(low + 1, bands.length - 1)]! : bands[low]!)
  }

  const random = seeded(7)
  const column = columnOf(w, h)
  for (let i = 0; i < cols * rows * 0.0035; i++) {
    const x = Math.floor(random() * cols)
    const y = Math.floor(random() * horizon * 0.85)
    const phase = random() * 6.28
    const twinkle = 0.5 + 0.5 * Math.sin(t * (0.6 + random()) + phase)
    const inColumn = x * px > column.left && x * px < column.right && y * px > column.top && y * px < column.bottom
    if (inColumn && random() < 0.75) continue
    if (twinkle > 0.35) put(x, y, twinkle > 0.7 ? starLight : starDim)
    if (twinkle > 0.93 && random() < 0.3) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) put(x + dx, y + dy, starRay)
  }

  const mx = Math.floor(phone ? cols * 0.62 : cols - 20)
  const my = Math.floor(phone ? 62 / px : rows * 0.16)
  const mr = phone ? 9 : 11
  for (let y = -mr - 3; y <= mr + 3; y++)
    for (let x = -mr - 3; x <= mr + 3; x++) {
      const d = Math.hypot(x, y)
      if (d <= mr) {
        const lit = Math.hypot(x + mr * 0.55, y - mr * 0.25) > mr * 0.95
        put(mx + x, my + y, lit && craters.has(`${x},${y}`) ? moonCrater : lit ? moonLit : moonDark)
      } else if (d <= mr + 3 && bayer[((y + 99) % 4) * 4 + ((x + 99) % 4)]! < (mr + 3 - d) / 6) put(mx + x, my + y, bands[2]!)
    }

  const lit = rgbOf(accent['400']!)
  const litDim = rgbOf(accent['600']!)
  const buildings = (seed: number, top: number, low: number, high: number, color: Rgb, windows: number, gap: number) => {
    const next = seeded(seed)
    let x = -2
    while (x < cols) {
      const wide = 6 + Math.floor(next() * 12)
      const tall = low + Math.floor(next() * (high - low))
      const roofY = top - tall
      const roof = next()
      for (let yy = roofY; yy < rows; yy++) for (let xx = x; xx < x + wide; xx++) put(xx, yy, color)
      if (roof < 0.25) for (let k = 1; k <= 3; k++) for (let xx = x + k; xx < x + wide - k; xx++) put(xx, roofY - k, color)
      if (roof > 0.85) for (let yy = roofY - 6; yy < roofY; yy++) put(x + Math.floor(wide / 2), yy, color)
      if (windows)
        for (let yy = roofY + 2; yy < rows - 1; yy += 3)
          for (let xx = x + 2; xx < x + wide - 2; xx += 2) {
            const id = xx * 131 + yy * 71 + seed
            const on = Math.abs((Math.sin(id) * 10000) % 1)
            const flip = Math.floor(t / 7 + Math.abs(Math.sin(id * 1.7)) * 9) % 9 === 0
            if (on < windows !== flip) put(xx, yy, on < windows * 0.45 ? lit : litDim)
          }
      x += wide + Math.floor(next() * gap)
    }
  }
  buildings(3, horizon + 2, 6, phone ? 34 : 22, far, 0, 2)
  buildings(11, horizon + 8, 5, phone ? 26 : 17, near, 0.16, 1)

  const tower = Math.floor(cols * 0.3)
  for (let yy = horizon - 30; yy < rows; yy++) for (let xx = tower; xx < tower + 7; xx++) put(xx, yy, near)
  for (let k = 0; k < 4; k++) for (let xx = tower + k; xx < tower + 7 - k; xx++) put(xx, horizon - 30 - k, near)
  put(tower + 3, horizon - 35, near)
  put(tower + 3, horizon - 36, near)
  for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (Math.hypot(xx, yy) <= 2.2) put(tower + 3 + xx, horizon - 22 + yy, moonLit)

  pen.putImageData(image, 0, 0)
  g.imageSmoothingEnabled = false
  g.drawImage(layer, 0, 0, cols * px, rows * px)
  calm(g, w, h, '#0c1024', 0.6)
}
