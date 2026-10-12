interface Range {
  aLo: number
  aHi: number
  bLo: number
  bHi: number
}

const middleSnake = (a: Int32Array, b: Int32Array, { aLo, aHi, bLo, bHi }: Range) => {
  const n = aHi - aLo
  const m = bHi - bLo
  const maxD = Math.ceil((n + m) / 2)
  const size = 2 * maxD
  const forward = new Int32Array(size + 2).fill(-1)
  const backward = new Int32Array(size + 2).fill(-1)
  forward[maxD + 1] = 0
  backward[maxD + 1] = 0
  const delta = n - m
  const odd = delta % 2 !== 0
  let forwardStart = 0
  let forwardEnd = 0
  let backwardStart = 0
  let backwardEnd = 0
  for (let d = 0; d < maxD; d++) {
    for (let k = -d + forwardStart; k <= d - forwardEnd; k += 2) {
      const at = maxD + k
      const down = k === -d || (k !== d && (forward[at - 1] ?? 0) < (forward[at + 1] ?? 0))
      let x = down ? (forward[at + 1] ?? 0) : (forward[at - 1] ?? 0) + 1
      let y = x - k
      while (x < n && y < m && a[aLo + x] === b[bLo + y]) {
        x++
        y++
      }
      forward[at] = x
      if (x > n) forwardEnd += 2
      else if (y > m) forwardStart += 2
      else if (odd) {
        const other = maxD + delta - k
        const reached = other >= 0 && other < size ? (backward[other] ?? -1) : -1
        if (reached !== -1 && x >= n - reached) return { x: aLo + x, y: bLo + y }
      }
    }
    for (let k = -d + backwardStart; k <= d - backwardEnd; k += 2) {
      const at = maxD + k
      const down = k === -d || (k !== d && (backward[at - 1] ?? 0) < (backward[at + 1] ?? 0))
      let x = down ? (backward[at + 1] ?? 0) : (backward[at - 1] ?? 0) + 1
      let y = x - k
      while (x < n && y < m && a[aHi - 1 - x] === b[bHi - 1 - y]) {
        x++
        y++
      }
      backward[at] = x
      if (x > n) backwardEnd += 2
      else if (y > m) backwardStart += 2
      else if (!odd) {
        const other = maxD + delta - k
        const reached = other >= 0 && other < size ? (forward[other] ?? -1) : -1
        if (reached !== -1 && reached >= n - x) return { x: aLo + reached, y: bLo + reached - (other - maxD) }
      }
    }
  }
  return undefined
}

const matchAll = (a: Int32Array, b: Int32Array) => {
  const matches = new Int32Array(a.length).fill(-1)
  const pending: Range[] = [{ aLo: 0, aHi: a.length, bLo: 0, bHi: b.length }]
  for (let range = pending.pop(); range; range = pending.pop()) {
    let { aLo, aHi, bLo, bHi } = range
    while (aLo < aHi && bLo < bHi && a[aLo] === b[bLo]) matches[aLo++] = bLo++
    while (aLo < aHi && bLo < bHi && a[aHi - 1] === b[bHi - 1]) matches[--aHi] = --bHi
    if (aLo === aHi || bLo === bHi) continue
    const split = middleSnake(a, b, { aLo, aHi, bLo, bHi })
    if (!split) continue
    pending.push({ aLo, aHi: split.x, bLo, bHi: split.y }, { aLo: split.x, aHi, bLo: split.y, bHi })
  }
  return matches
}

const sharedPositions = (lines: Int32Array, other: Int32Array) => {
  const present = new Set(other)
  return Int32Array.from(lines.keys()).filter(index => present.has(lines[index] ?? -1))
}

export const matchLines = (a: Int32Array, b: Int32Array) => {
  const inA = sharedPositions(a, b)
  const inB = sharedPositions(b, a)
  const inner = matchAll(
    inA.map(index => a[index] ?? -1),
    inB.map(index => b[index] ?? -1),
  )
  const matches = new Int32Array(a.length).fill(-1)
  inner.forEach((matched, index) => {
    if (matched >= 0) matches[inA[index] ?? 0] = inB[matched] ?? -1
  })
  return matches
}
