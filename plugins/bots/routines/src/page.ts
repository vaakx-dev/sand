import type { Check } from '@sand/schedules/contract'
import { z } from 'zod'

const timeoutMs = 30_000
const shownLength = 2000

const textOf = (html: string) =>
  html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const input = z.object({ url: z.url().describe('The web page to watch') })

export const pageCheck: Check<typeof input> = {
  name: 'page-changed',
  description: "Fires when the text of a web page changes, and passes you the page's new text",
  input,
  async run({ url }, state, signal) {
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]) })
    if (!response.ok) throw new Error(`${url} answered ${response.status}`)
    const text = textOf(await response.text())
    const hash = String(Bun.hash(text))
    if (state === undefined || state === hash) return { fire: false, state: hash }
    return { fire: true, state: hash, note: `${url} changed. It now reads:\n${text.slice(0, shownLength)}` }
  },
}
