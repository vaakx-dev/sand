import { lcsLines } from '@sand/kit'

export type Mark = [from: number, to: number]

const maxTokens = 400
const minShared = 0.4

const tokens = (text: string) => text.match(/\w+|\s+|[^\w\s]/g) ?? []

const extend = (marks: Mark[], from: number, to: number) => {
  const last = marks.at(-1)
  if (last && last[1] === from) last[1] = to
  else marks.push([from, to])
}

export const wordMarks = (before: string, after: string) => {
  const left = tokens(before)
  const right = tokens(after)
  if (left.length > maxTokens || right.length > maxTokens) return undefined
  const removed: Mark[] = []
  const added: Mark[] = []
  let from = 0
  let to = 0
  let shared = 0
  for (const part of lcsLines(left, right)) {
    const size = part.text.length
    if (part.kind === 'del') {
      extend(removed, from, from + size)
      from += size
    } else if (part.kind === 'add') {
      extend(added, to, to + size)
      to += size
    } else {
      from += size
      to += size
      shared += size
    }
  }
  return shared >= Math.max(before.length, after.length) * minShared ? { before: removed, after: added } : undefined
}
