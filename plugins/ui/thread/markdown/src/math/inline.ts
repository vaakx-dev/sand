import { math } from './renderer'

interface Formula {
  tex: string
  display: boolean
  end: number
}

const space = /\s/

const between = (source: string, start: number, close: string, display: boolean): Formula | undefined => {
  const end = source.indexOf(close, start)
  const tex = source.slice(start, end)
  return end > start && tex.trim() ? { tex, display, end: end + close.length } : undefined
}

const dollarClose = (source: string, start: number) => {
  for (let index = start; index < source.length; index++) {
    if (source[index] === '\\') index++
    else if (source[index] === '$') return space.test(source[index - 1]!) || /\d/.test(source[index + 1] ?? '') ? -1 : index
  }
  return -1
}

const dollar = (source: string, start: number): Formula | undefined => {
  if (space.test(source[start] ?? ' ')) return undefined
  const end = dollarClose(source, start)
  return end < 0 ? undefined : { tex: source.slice(start, end), display: false, end: end + 1 }
}

const formulaAt = (source: string, index: number) => {
  if (source.startsWith('$$', index)) return between(source, index + 2, '$$', true)
  if (source[index] === '$') return dollar(source, index + 1)
  if (source.startsWith('\\(', index)) return between(source, index + 2, '\\)', false)
  if (source.startsWith('\\[', index)) return between(source, index + 2, '\\]', true)
  return undefined
}

export const inlineMath = (source: string, index: number) => {
  const renderer = math()
  const formula = renderer && formulaAt(source, index)
  if (!formula) return undefined
  return { item: formula.display ? renderer.display(formula.tex) : renderer.inline(formula.tex), end: formula.end }
}
