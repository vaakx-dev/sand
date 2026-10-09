export interface Point {
  x: number
  y: number
}

const slopesOf = (points: Point[]) =>
  points.slice(1).map((point, index) => {
    const before = points[index]!
    const dx = point.x - before.x
    return dx === 0 ? 0 : (point.y - before.y) / dx
  })

const tangentsOf = (points: Point[]) => {
  const slopes = slopesOf(points)
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0] ?? 0
    if (index === points.length - 1) return slopes.at(-1) ?? 0
    const before = slopes[index - 1]!
    const after = slopes[index]!
    return before * after <= 0 ? 0 : (before + after) / 2
  })
  slopes.forEach((slope, index) => {
    if (slope === 0) {
      tangents[index] = 0
      tangents[index + 1] = 0
      return
    }
    const a = tangents[index]! / slope
    const b = tangents[index + 1]! / slope
    const size = a * a + b * b
    if (size <= 9) return
    const scale = 3 / Math.sqrt(size)
    tangents[index] = scale * a * slope
    tangents[index + 1] = scale * b * slope
  })
  return tangents
}

const fixed = (value: number) => value.toFixed(2)

export const curve = (points: Point[]) => {
  if (points.length < 2) return ''
  const tangents = tangentsOf(points)
  return points.slice(1).reduce((path, to, index) => {
    const from = points[index]!
    const third = (to.x - from.x) / 3
    const first = `${fixed(from.x + third)},${fixed(from.y + tangents[index]! * third)}`
    const second = `${fixed(to.x - third)},${fixed(to.y - tangents[index + 1]! * third)}`
    return `${path} C${first} ${second} ${fixed(to.x)},${fixed(to.y)}`
  }, `M${fixed(points[0]!.x)},${fixed(points[0]!.y)}`)
}
