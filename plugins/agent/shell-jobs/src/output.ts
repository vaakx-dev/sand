const kept = 30_000

export const outputTail = () => {
  let text = ''
  let start = 0

  return {
    write(chunk: string) {
      text += chunk
      if (text.length <= 2 * kept) return
      start += text.length - kept
      text = text.slice(-kept)
    },
    read(cursor = 0) {
      const end = start + text.length
      const from = Math.max(cursor, end - kept)
      const dropped = from > cursor ? `… ${from - cursor} earlier characters dropped\n` : ''
      return `${dropped}${text.slice(from - start) || '(no new output)'}\n[cursor ${end}]`
    },
    last: (length: number) => text.slice(-length),
  }
}

export type OutputTail = ReturnType<typeof outputTail>
