import { plural, type DiffKind } from '@sand/kit'
import type { FileChange } from '../../changes/collect'
import { fileLines, type Line } from './rows'

const signs: Record<DiffKind, string> = { add: '+', del: '-', ctx: ' ', gap: ' ' }

const numbersOf = (lines: Line[], side: 'old' | 'new') => lines.flatMap(line => (line[side] === undefined ? [] : [line[side]]))

const rangeOf = (lines: Line[]) => {
  const news = numbersOf(lines, 'new')
  const numbers = news.length ? news : numbersOf(lines, 'old')
  const first = numbers[0]
  const last = numbers.at(-1)
  if (first === undefined || last === undefined) return undefined
  return { first, last }
}

export const selectedLines = (file: FileChange, from: number, to: number) => fileLines(file).flat().filter(line => line.at >= from && line.at <= to)

export const selectionLabel = (lines: Line[]) => {
  const range = rangeOf(lines)
  if (!range) return plural(lines.length, 'line')
  return range.first === range.last ? `Line ${range.first}` : `Lines ${range.first}–${range.last}`
}

const location = (file: FileChange, lines: Line[]) => {
  const range = rangeOf(lines)
  if (!range) return file.path
  return range.first === range.last ? `${file.path}:${range.first}` : `${file.path}:${range.first}-${range.last}`
}

export const quoteText = (file: FileChange, lines: Line[]) => [location(file, lines), ...lines.map(line => signs[line.kind] + line.text)].join('\n')
