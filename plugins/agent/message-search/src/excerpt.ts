import { type Range, wordMatches } from '@sand/util'
import type { Excerpt } from './contract'

interface Window {
  start: number
  span: number
}

const LENGTH = 120
const LEAD = 24

const spanFrom = (found: Range[][], start: number) =>
  found.reduce<number | undefined>((span, ranges) => {
    const end = ranges.find(([from]) => from >= start)?.[1]
    return span === undefined || end === undefined ? undefined : Math.max(span, end - start)
  }, 0)

const meeting = (text: string, words: string[]) => {
  const found = words.map(word => wordMatches(text, [word])).filter(ranges => ranges.length)
  const windows = found.flat().flatMap(([start]): Window[] => {
    const span = spanFrom(found, start)
    return span === undefined ? [] : [{ start, span }]
  })
  return windows.reduce<Window | undefined>((best, window) => (!best || window.span < best.span ? window : best), undefined)?.start ?? 0
}

const startBefore = (text: string, meet: number) => {
  if (meet <= LEAD) return 0
  const space = text.indexOf(' ', meet - LEAD)
  return space < 0 || space >= meet ? meet : space + 1
}

const endAfter = (text: string, start: number, meet: number) => {
  const limit = start + LENGTH
  if (limit >= text.length) return text.length
  const space = text.lastIndexOf(' ', limit)
  return space > meet ? space : limit
}

const excerptOf = (block: string, words: string[]): Excerpt => {
  const line = block.replace(/\s+/g, ' ').trim()
  const meet = meeting(line, words)
  const start = startBefore(line, meet)
  const end = endAfter(line, start, meet)
  const text = `${start > 0 ? '…' : ''}${line.slice(start, end)}${end < line.length ? '…' : ''}`
  return { text, marks: wordMatches(text, words) }
}

export { excerptOf }
