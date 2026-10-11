import { errorMessage } from '@sand/kit'

export class GithubError extends Error {}

const retryAt = (headers: Headers) => {
  const after = Number(headers.get('retry-after'))
  if (after > 0) return Date.now() + after * 1000
  const reset = Number(headers.get('x-ratelimit-reset'))
  if (reset > 0) return reset * 1000
}

const limited = ({ status, headers }: Response) =>
  status === 429 || (status === 403 && (headers.get('x-ratelimit-remaining') === '0' || headers.has('retry-after')))

const limitError = (headers: Headers) => {
  const at = retryAt(headers)
  const when = at ? `after ${new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'later'
  return new GithubError(`GitHub is limiting how often this network can ask it for updates; try again ${when}`)
}

const statusError = (status: number, url: string) =>
  new GithubError(status >= 500 ? `GitHub is having trouble (HTTP ${status}); try again later` : `GitHub answered HTTP ${status} for ${url}`)

const failure = (error: unknown, timeout: number) => {
  if (error instanceof GithubError) return error
  if (error instanceof SyntaxError) return new GithubError('GitHub sent an answer sand could not read')
  if (error instanceof Error && error.name === 'TimeoutError') return new GithubError(`GitHub did not answer within ${Math.round(timeout / 1000)} seconds`)
  return new GithubError(`could not reach GitHub: ${errorMessage(error)}`)
}

export const githubGet = async <T>(
  url: string,
  timeout: number,
  read: (response: Response) => Promise<T>,
  headers: Record<string, string> = {},
): Promise<T | undefined> => {
  try {
    const response = await fetch(url, { headers: { 'user-agent': 'sand', ...headers }, signal: AbortSignal.timeout(timeout), redirect: 'follow' })
    if (limited(response)) throw limitError(response.headers)
    if (response.status === 404) return undefined
    if (!response.ok) throw statusError(response.status, url)
    return await read(response)
  } catch (error) {
    throw failure(error, timeout)
  }
}
