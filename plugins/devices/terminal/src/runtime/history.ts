import type { Size } from '../contract'

interface Mark {
  at: number
  grid: Size
}

const joinBelow = 4096

const isHigh = (code: number) => code >= 0xd800 && code <= 0xdbff

export const createHistory = (limit: number, grid: Size) => {
  const chunks: string[] = []
  const marks: Mark[] = [{ at: 0, grid }]
  let start = 0
  let end = 0

  const dropPassedMarks = () => {
    while (marks.length > 1 && marks[1]!.at <= start) marks.shift()
  }

  const trim = () => {
    while (end - start > limit) {
      const first = chunks[0]!
      const over = end - start - limit
      if (first.length <= over) {
        chunks.shift()
        start += first.length
      } else {
        chunks[0] = first.slice(over)
        start += over
      }
    }
    dropPassedMarks()
  }

  const nextMark = (from: number) => marks.find(mark => mark.at > from)?.at ?? end

  const recent = (most: number) => {
    const from = Math.max(start, end - most)
    if (from === 0) return from
    const line = read(from, end).indexOf('\n')
    return line === -1 ? from : from + line + 1
  }

  const read = (from: number, to: number) => {
    let at = start
    let text = ''
    for (const chunk of chunks) {
      const next = at + chunk.length
      if (next > from && at < to) text += chunk.slice(Math.max(0, from - at), Math.min(chunk.length, to - at))
      at = next
      if (at >= to) break
    }
    return text
  }

  return {
    start: () => start,
    end: () => end,
    append(text: string) {
      if (!text) return
      const last = chunks.at(-1)
      if (last !== undefined && last.length < joinBelow) chunks[chunks.length - 1] = last + text
      else chunks.push(text)
      end += text.length
      trim()
    },
    resize(next: Size) {
      const last = marks.at(-1)!
      if (last.at === end) last.grid = next
      else marks.push({ at: end, grid: next })
    },
    grid: () => marks.at(-1)!.grid,
    gridAt: (offset: number) => marks.findLast(mark => mark.at <= offset)!.grid,
    read,
    recent,
    cut(from: number, most: number) {
      const to = Math.min(nextMark(from), from + most)
      return to < end && to > from && isHigh(read(to - 1, to).charCodeAt(0)) ? to - 1 : to
    },
  }
}

export type History = ReturnType<typeof createHistory>
