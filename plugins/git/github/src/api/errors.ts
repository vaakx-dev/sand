import { errorMessage, isRecord } from '@sand/util'

export class GitHubError extends Error {
  readonly status?: number
  readonly kind?: string

  constructor(message: string, status?: number, kind?: string) {
    super(message)
    this.name = 'GitHubError'
    if (status !== undefined) this.status = status
    if (kind !== undefined) this.kind = kind
  }
}

export const sentence = (text: string) => {
  const trimmed = text.trim()
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

const detailOf = (entry: unknown) => {
  if (typeof entry === 'string') return entry
  if (!isRecord(entry)) return ''
  if (typeof entry.message === 'string') return entry.message
  return [entry.resource, entry.field, entry.code].filter(part => typeof part === 'string').join(' ')
}

const reasonOf = (data: unknown) => {
  if (!isRecord(data)) return ''
  const details = Array.isArray(data.errors) ? data.errors.map(detailOf).filter(Boolean) : []
  if (details.length) return details.join('; ')
  return typeof data.message === 'string' ? data.message : ''
}

export const restError = (status: number, data: unknown) => {
  const reason = reasonOf(data)
  if (status === 404) return new GitHubError("GitHub couldn't find that, or this PC's GitHub sign-in can't see it.", status)
  if (status >= 500) return new GitHubError(`GitHub is having trouble (HTTP ${status}); try again later.`, status)
  return new GitHubError(sentence(reason ? `GitHub said: ${reason}` : `GitHub answered HTTP ${status}`), status)
}

export const graphqlError = (errors: unknown[]) => {
  const first = errors[0]
  const kind = isRecord(first) && typeof first.type === 'string' ? first.type : undefined
  const reasons = errors.map(detailOf).filter(Boolean)
  return new GitHubError(sentence(`GitHub said: ${reasons.join('; ') || 'the request failed'}`), undefined, kind)
}

export const rejectedError = () => new GitHubError("GitHub didn't accept this PC's sign-in; sign in to GitHub again.", 401)

export const unreadableError = () => new GitHubError("GitHub sent an answer sand couldn't read.")

export const reachError = (error: unknown, timeoutMs: number) => {
  if (error instanceof GitHubError) return error
  if (error instanceof Error && error.name === 'TimeoutError') return new GitHubError(`GitHub didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`)
  return new GitHubError(sentence(`Couldn't reach GitHub: ${errorMessage(error)}`))
}
