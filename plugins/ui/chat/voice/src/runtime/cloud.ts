import { trimSlash } from '@sand/util'
import { z } from 'zod'
import type { Cloud } from '../contract'

const TIMEOUT_MS = 60_000

const UNAUTHORIZED = new Set([401, 403])

const answer = z.object({ text: z.string() })

const refusal = async (response: Response) => {
  if (UNAUTHORIZED.has(response.status)) return 'The speech service refused the key. Check it in Settings › Voice.'
  const detail = (await response.text().catch(() => '')).trim().slice(0, 300)
  return `The speech service answered HTTP ${response.status}${detail ? `: ${detail}` : ''}`
}

const transcribeInCloud = async ({ url, model }: Cloud, key: string, audio: Blob) => {
  const form = new FormData()
  form.append('file', audio, 'speech.wav')
  form.append('model', model)
  form.append('response_format', 'json')
  const response = await fetch(`${trimSlash(url)}/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'user-agent': 'sand' },
    body: form,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(await refusal(response))
  const parsed = answer.safeParse(await response.json().catch(() => undefined))
  if (!parsed.success) throw new Error("The speech service's answer had no text")
  return parsed.data.text.trim()
}

export { transcribeInCloud }
