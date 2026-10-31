import { isRecord } from '@sand/util'
import { apiHeaders, apiUrl, graphqlUrl } from './endpoint'
import { graphqlError, reachError, rejectedError, restError, unreadableError } from './errors'
import { createEtags } from './etags'
import { createLimit } from './limit'
import { createRate, type Resource } from './rate'

const timeoutMs = 30_000
const most = 4

export interface ClientDeps {
  token(): Promise<string>
  rejected(): void
}

export interface Client {
  rest<T>(method: string, path: string, body?: unknown): Promise<T>
  graphql<T>(query: string, variables: Record<string, unknown>): Promise<T>
}

const readJson = async (response: Response): Promise<unknown> => {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    throw unreadableError()
  }
}

export const createClient = (deps: ClientDeps): Client => {
  const limit = createLimit(most)
  const rate = createRate()
  const etags = createEtags()
  let lastToken: string | undefined

  const tokenFor = async () => {
    const token = await deps.token()
    if (lastToken !== undefined && lastToken !== token) etags.clear()
    lastToken = token
    return token
  }

  const exchange = <T>(resource: Resource, url: string, init: RequestInit, extra: Record<string, string>, read: (response: Response) => Promise<T>) =>
    limit(async () => {
      rate.check(resource)
      const token = await tokenFor()
      try {
        const response = await fetch(url, { ...init, headers: { ...apiHeaders(token), ...extra }, signal: AbortSignal.timeout(timeoutMs) })
        rate.note(resource, response)
        if (response.status === 401) {
          deps.rejected()
          throw rejectedError()
        }
        return await read(response)
      } catch (error) {
        throw reachError(error, timeoutMs)
      }
    })

  return {
    rest<T>(method: string, path: string, body?: unknown) {
      const verb = method.toUpperCase()
      const cached = verb === 'GET' ? etags.get(path) : undefined
      const extra: Record<string, string> = {
        ...(cached ? { 'if-none-match': cached.etag } : {}),
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      }
      const init: RequestInit = { method: verb, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }
      return exchange('core', `${apiUrl}${path}`, init, extra, async response => {
        if (response.status === 304 && cached) return cached.body as T
        const data = await readJson(response)
        if (!response.ok) throw restError(response.status, data)
        const etag = verb === 'GET' ? response.headers.get('etag') : null
        if (etag) etags.set(path, etag, data)
        return data as T
      })
    },
    graphql<T>(query: string, variables: Record<string, unknown>) {
      const init: RequestInit = { method: 'POST', body: JSON.stringify({ query, variables }) }
      return exchange('graphql', graphqlUrl, init, { 'content-type': 'application/json' }, async response => {
        const data = await readJson(response)
        if (!response.ok) throw restError(response.status, data)
        if (!isRecord(data)) throw unreadableError()
        if (Array.isArray(data.errors) && data.errors.length) throw graphqlError(data.errors)
        return data.data as T
      })
    },
  }
}
