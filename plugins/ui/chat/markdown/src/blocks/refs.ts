import { closingFence, fence } from './rules'

interface Reference {
  url: string
  title?: string
}

export type Refs = Map<string, Reference>

const definition = /^ {0,3}\[([^\]]+)\]:\s*<?([^\s>]+)>?(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/

export const label = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()

export const extractRefs = (lines: string[]) => {
  const refs: Refs = new Map()
  const kept: string[] = []
  let closing: RegExp | undefined
  for (const line of lines) {
    const opening = closing ? undefined : fence.exec(line)?.[2]
    if (closing?.test(line)) closing = undefined
    else if (opening) closing = closingFence(opening)
    const match = closing || opening ? undefined : definition.exec(line)
    if (!match) {
      kept.push(line)
      continue
    }
    const key = label(match[1]!)
    if (!refs.has(key)) refs.set(key, { url: match[2]!, title: match[3] ?? match[4] ?? match[5] })
  }
  return { lines: kept, refs }
}
