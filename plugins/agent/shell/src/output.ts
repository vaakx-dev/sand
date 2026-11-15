import { charStart, tail } from '@sand/util'

export interface OutputSnapshot {
  text: string
  start: number
}

const KEPT_CHARS = 30_000

const EMPTY: OutputSnapshot = { text: '', start: 0 }

export const outputTail = (from: OutputSnapshot = EMPTY) => {
  let { text, start } = from

  return {
    write(chunk: string) {
      text += chunk
      if (text.length <= 2 * KEPT_CHARS) return
      const cut = charStart(text, text.length - KEPT_CHARS)
      start += cut
      text = text.slice(cut)
    },
    read(cursor = 0) {
      const end = start + text.length
      const from = Math.max(cursor, end - KEPT_CHARS)
      const dropped = from > cursor ? `… ${from - cursor} earlier characters dropped\n` : ''
      return `${dropped}${text.slice(charStart(text, from - start)) || '(no new output)'}\n[cursor ${end}]`
    },
    last: (length: number) => tail(text, length),
    snapshot: (): OutputSnapshot => ({ text, start }),
  }
}

export type OutputTail = ReturnType<typeof outputTail>
