import { GitHubError } from './errors'

export type Resource = 'core' | 'graphql'

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

const limitError = (resource: Resource, until: number) =>
  new GitHubError(`This PC has used up its GitHub ${resource === 'graphql' ? 'GraphQL ' : ''}rate limit until ${clock(until)}; try again then.`, 429)

export const createRate = () => {
  const blocked = new Map<Resource, number>()

  const check = (resource: Resource) => {
    const until = blocked.get(resource)
    if (until === undefined) return
    if (until > Date.now()) throw limitError(resource, until)
    blocked.delete(resource)
  }

  const note = (resource: Resource, response: Response) => {
    const named = response.headers.get('x-ratelimit-resource')
    const bucket: Resource = named === 'graphql' || named === 'core' ? named : resource
    if (refused(response)) {
      const until = resetAt(response.headers)
      blocked.set(bucket, until)
      throw limitError(bucket, until)
    }
    if (response.ok && exhausted(response)) blocked.set(bucket, resetAt(response.headers))
  }

  return { check, note }
}
