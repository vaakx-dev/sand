const tokens = (query: string) =>
  [...query.matchAll(/"([^"]*)"|(\S+)/g)].map(([, phrase, word]) => (phrase === undefined ? { phrase: false, text: word! } : { phrase: true, text: phrase }))

const fuzzy = (needle: string, text: string) => {
  let at = -1
  let gaps = 0
  for (const char of needle) {
    const next = text.indexOf(char, at + 1)
    if (next < 0) return undefined
    gaps += next - at - 1
    at = next
  }
  return gaps
}

const regex = (pattern: string, text: string) => {
  try {
    const found = text.search(new RegExp(pattern, 'i'))
    return found < 0 ? undefined : found
  } catch {
    return undefined
  }
}

export const score = (query: string, text: string) => {
  if (query.startsWith('re:')) return regex(query.slice(3), text)
  const lower = text.toLowerCase()
  let total = 0
  for (const token of tokens(query.toLowerCase())) {
    const found = token.phrase ? lower.indexOf(token.text) : fuzzy(token.text, lower)
    if (found === undefined || found < 0) return undefined
    total += found
  }
  return total
}

export const matching = (texts: string[], query: string, rank = false) => {
  const trimmed = query.trim()
  if (!trimmed) return texts.map((_, index) => index)
  const scored = texts.flatMap((text, index) => {
    const found = score(trimmed, text)
    return found === undefined ? [] : [{ index, found }]
  })
  if (rank) scored.sort((a, b) => a.found - b.found || a.index - b.index)
  return scored.map(entry => entry.index)
}
