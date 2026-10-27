import { inlineCode } from '../nodes'
import type { Scope } from '../scope'
import { displayMath } from './block'

interface Formula {
  tex: string
  display: boolean
  end: number
}

const space = /\s/
const punctuation = /[\p{P}\p{S}]/u
const digit = /\d/
const openingBracket = /[([{]/
const texLike = /^\s|[\\^_=]/

const isSpace = (char: string) => !char || space.test(char)

const opens = (before: string, after: string) =>
  !isSpace(after) && (!punctuation.test(after) || isSpace(before) || punctuation.test(before)) && !digit.test(before)

const closes = (before: string, after: string) =>
  !isSpace(before) && (!punctuation.test(before) || isSpace(after) || punctuation.test(after)) && !digit.test(after) && !openingBracket.test(after)

const between = (source: string, start: number, close: string, display: boolean): Formula | undefined => {
  const end = source.indexOf(close, start)
  const tex = source.slice(start, end)
  return end > start && tex.trim() ? { tex, display, end: end + close.length } : undefined
}

const dollarClose = (source: string, start: number) => {
  let braces = 0
  let brackets = 0
  for (let index = start; index < source.length; index++) {
    const char = source[index]
    if (char === '\\') index++
    else if (char === '{') braces++
    else if (char === '}') braces--
    else if (char === '(' || char === '[') brackets++
    else if (char === ')' || char === ']') brackets--
    else if (char === '$' && !braces) return !brackets && closes(source[index - 1]!, source[index + 1] ?? '') ? index : -1
    if (braces < 0 || brackets < 0) return -1
  }
  return -1
}

const dollar = (source: string, open: number): Formula | undefined => {
  if (!opens(source[open - 1] ?? '', source[open + 1] ?? '')) return undefined
  const end = dollarClose(source, open + 1)
  return end < 0 ? undefined : { tex: source.slice(open + 1, end), display: false, end: end + 1 }
}

const bracketed = (source: string, index: number) => {
  const formula = between(source, index + 2, '\\]', true)
  return formula && texLike.test(formula.tex) ? formula : undefined
}

const findFormula = (source: string, index: number) => {
  if (source.startsWith('$$', index)) return between(source, index + 2, '$$', true)
  if (source[index] === '$') return dollar(source, index)
  if (source.startsWith('\\(', index)) return between(source, index + 2, '\\)', false)
  if (source.startsWith('\\[', index)) return bracketed(source, index)
  return undefined
}

let cache = { source: '', formulas: new Map<number, Formula | undefined>() }

export const formulaAt = (source: string, index: number, { math }: Scope) => {
  if (!math || (source[index] !== '$' && source[index] !== '\\')) return undefined
  if (cache.source !== source) cache = { source, formulas: new Map() }
  if (!cache.formulas.has(index)) cache.formulas.set(index, findFormula(source, index))
  return cache.formulas.get(index)
}

export const inlineMath = (source: string, index: number, scope: Scope) => {
  const { math } = scope
  const formula = math && formulaAt(source, index, scope)
  if (!formula) return undefined
  if (formula.display) return { item: displayMath(scope, formula.tex), end: formula.end }
  const shown = math.inline(formula.tex)
  return { item: shown instanceof Node ? shown : inlineCode(formula.tex, shown.error), end: formula.end }
}
