const joinBelow = 4096

const isHigh = (code: number) => code >= 0xd800 && code <= 0xdbff

export const createHistory = (limit: number) => {
  const chunks: string[] = []
  let start = 0
  let end = 0

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
    read,
    cut(from: number, most: number) {
      const to = Math.min(end, from + most)
      return to < end && to > from && isHigh(read(to - 1, to).charCodeAt(0)) ? to - 1 : to
    },
    tail(most: number) {
      const from = Math.max(start, end - most)
      const text = read(from, end)
      if (from === 0) return text
      const line = text.indexOf('\n')
      return line === -1 ? text : text.slice(line + 1)
    },
  }
}

export type History = ReturnType<typeof createHistory>
