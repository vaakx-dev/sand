const layers = [
  { base: 7.2, height: 2.2, lightness: 0.8, chroma: 0.09 },
  { base: 10.2, height: 1.5, lightness: 0.7, chroma: 0.12 },
  { base: 12.4, height: 1.1, lightness: 0.6, chroma: 0.14 },
]

const hash = (text: string) => {
  let value = 2166136261
  for (const char of text) value = Math.imul(value ^ (char.codePointAt(0) ?? 0), 16777619)
  return value >>> 0
}

const randomFrom = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
}

const dune = (random: () => number, base: number, height: number) => {
  const frequency = 0.14 + random() * 0.12
  const phase = random() * 7
  const top = base + (random() - 0.5) * 1.6
  const ridge = Array.from({ length: 17 }, (_, x) => `${x} ${(top - Math.sin(x * frequency + phase) * height).toFixed(2)}`)
  return `M${ridge.join('L')}L16 16L0 16Z`
}

export const duneIcon = (name: string) => {
  const seed = hash(name)
  const hue = seed % 360
  const random = randomFrom(seed)
  const dunes = layers.map(layer => `<path d="${dune(random, layer.base, layer.height)}" fill="oklch(${layer.lightness} ${layer.chroma} ${hue})"/>`)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect width="16" height="16" fill="oklch(0.7 0.12 ${hue} / 0.18)"/>${dunes.join('')}</svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
