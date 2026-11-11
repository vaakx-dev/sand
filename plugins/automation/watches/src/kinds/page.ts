import { head } from '@sand/util'
import { z } from 'zod'
import type { Kind } from '../contract'
import { poll } from './poll'

const timeoutMs = 30_000
const shownLength = 2000

const textOf = (html: string) =>
  html
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const input = z.object({
  url: z.url().describe('The web page to watch'),
  every_minutes: z.number().int().min(5).default(60).describe('How often to look at it, in minutes'),
})

export const page: Kind<typeof input> = {
  name: 'page',
  label: 'Web page',
  description: "Notices when the text of a web page changes, and passes you the page's new text",
  input,
  describe: ({ url }) => url,
  start({ url, every_minutes }, context) {
    poll(every_minutes, context, async () => {
      const response = await fetch(url, { signal: AbortSignal.any([context.signal, AbortSignal.timeout(timeoutMs)]) })
      if (!response.ok) throw new Error(`${url} answered ${response.status}`)
      const text = textOf(await response.text())
      const hash = String(Bun.hash(text))
      const seen = context.state
      if (seen === hash) return
      context.save(hash)
      if (seen !== undefined) context.emit({ at: Date.now(), from: url, summary: `${url} changed`, detail: head(text, shownLength) })
    })
  },
}
