export interface Region {
  x: number
  y: number
  width: number
  height: number
}

const maxEdge = 1568
const maxPixels = 1_150_000
const maxTiles = 6

const tileHeight = (width: number, scale: number) => Math.max(1, Math.floor(Math.min(maxEdge, maxPixels / (width * scale)) / scale))

export const tiles = (region: Region, scale: number): Region[] => {
  const step = tileHeight(region.width, scale)
  const shown = Math.min(region.height, step * maxTiles)
  return Array.from({ length: Math.ceil(shown / step) }, (_, index) => ({
    ...region,
    y: region.y + index * step,
    height: Math.min(step, shown - index * step),
  }))
}
