import { pageUrl } from '../page/home'

const timeout = 15_000

export interface JsonReply {
  ok: boolean
  status: number
  body: unknown
}

const replyOf = async (response: Response): Promise<JsonReply> => ({
  ok: response.ok,
  status: response.status,
  body: await response.json().catch(() => undefined),
})

export const postJson = async (path: string, body: unknown) =>
  replyOf(
    await fetch(pageUrl(path), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeout),
    }),
  )

export const getJson = async (path: string) => replyOf(await fetch(pageUrl(path), { cache: 'no-store', signal: AbortSignal.timeout(timeout) }))
