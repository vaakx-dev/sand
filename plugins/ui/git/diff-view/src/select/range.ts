import type { DiffLine, DiffRange, DiffSide } from '../contract'

const numbersOn = (lines: DiffLine[], side: DiffSide) => lines.flatMap(line => (line[side] === undefined ? [] : [line[side]]))

export const rangeOf = (path: string, lines: DiffLine[]): DiffRange | undefined => {
  const kept = numbersOn(lines, 'new')
  const side: DiffSide = kept.length ? 'new' : 'old'
  const numbers = kept.length ? kept : numbersOn(lines, 'old')
  if (!numbers.length) return undefined
  return {
    path,
    side,
    start: numbers.reduce((a, b) => Math.min(a, b)),
    end: numbers.reduce((a, b) => Math.max(a, b)),
    lines,
  }
}
