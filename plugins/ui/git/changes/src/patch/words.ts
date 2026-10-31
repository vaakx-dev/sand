import { commonTokens } from './lcs'
import type { DiffLine, DiffSpan } from './line'

const longLine = 400
const manyTokens = 160
const minShared = 0.4

const tokenize = (text: string) => text.match(/\w+|\s+|[^\w\s]/g) ?? []

const changedSpans = (tokens: string[], kept: boolean[]) => {
  const spans: DiffSpan[] = []
  let at = 0
  tokens.forEach((token, index) => {
    const end = at + token.length
    const last = spans.at(-1)
    if (!kept[index]) {
      if (last && last.end === at) last.end = end
      else spans.push({ start: at, end })
    }
    at = end
  })
  return spans
}

const joinAcrossSpaces = (text: string, spans: DiffSpan[]) =>
  spans.reduce<DiffSpan[]>((joined, span) => {
    const last = joined.at(-1)
    if (last && !text.slice(last.end, span.start).trim()) last.end = span.end
    else joined.push({ ...span })
    return joined
  }, [])

const sharedLength = (tokens: string[], kept: boolean[]) => tokens.reduce((sum, token, index) => (kept[index] && token.trim() ? sum + token.length : sum), 0)

const markPair = (removed: DiffLine, added: DiffLine) => {
  if (removed.text.length > longLine || added.text.length > longLine) return
  const before = tokenize(removed.text)
  const after = tokenize(added.text)
  if (!before.length || !after.length || before.length > manyTokens || after.length > manyTokens) return
  const [keepBefore, keepAfter] = commonTokens(before, after)
  const longest = Math.max(removed.text.trim().length, added.text.trim().length)
  if (sharedLength(before, keepBefore) < longest * minShared) return
  removed.marks = joinAcrossSpaces(removed.text, changedSpans(before, keepBefore))
  added.marks = joinAcrossSpaces(added.text, changedSpans(after, keepAfter))
}

export const emphasize = (removed: DiffLine[], added: DiffLine[]) => {
  const count = Math.min(removed.length, added.length)
  for (let index = 0; index < count; index++) markPair(removed[index]!, added[index]!)
}
