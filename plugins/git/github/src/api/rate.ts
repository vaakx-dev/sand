import { GitHubError } from './errors'

const resetAt = (headers: Headers) => {
  const after = Number(headers.get('retry-after'))
  if (after > 0) return Date.now() + after * 1000
  const reset = Number(headers.get('x-ratelimit-reset'))
  return reset > 0 ? reset * 1000 : Date.now() + 60_000
}

const exhausted = (response: Response) => response.headers.get('x-ratelimit-remaining') === '0'

const refused = (response: Response) =>
  response.status === 429 || (response.status === 403 && (exhausted(response) || response.headers.has('retry-after')))

const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

const limitError = (until: number) => new GitHubError(`This PC has used up its GitHub rate limit until ${clock(until)}; try again then.`)

export const createRate = () => {
  let blocked: number | undefined

  const check = () => {
    if (blocked === undefined) return
    if (blocked > Date.now()) throw limitError(blocked)
    blocked = undefined
  }

  const note = (response: Response) => {
    if (refused(response)) {
      blocked = resetAt(response.headers)
      throw limitError(blocked)
    }
    if (response.ok && exhausted(response)) blocked = resetAt(response.headers)
  }

  return { check, note }
}
