const kept = 1_000_000

export const createOutput = () => {
  let text = ''
  let dropped = 0

  const shrink = (limit: number) => {
    if (text.length <= limit) return
    dropped += text.length - limit
    text = text.slice(-limit)
  }

  return {
    add(chunk: string) {
      text += chunk
      shrink(kept)
    },
    shrink,
    since(cursor: number, max: number) {
      const from = Math.max(cursor, dropped)
      const slice = text.slice(from - dropped, from - dropped + max)
      const next = from + slice.length
      const left = dropped + text.length - next
      return [
        from > cursor && `… ${from - cursor} older characters were dropped`,
        slice || '(no new output)',
        `[cursor ${next}${left > 0 ? `; ${left} more characters after it` : ''}]`,
      ]
        .filter(Boolean)
        .join('\n')
    },
    tail: (max: number) => text.slice(-max),
  }
}
