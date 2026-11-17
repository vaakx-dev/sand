import { errorMessage } from '@sand/util'
import { z } from 'zod'

export class GitHubError extends Error {
  override name = 'GitHubError'

  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message)
  }
}

const sentence = (text: string) => {
  const trimmed = text.trim()
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

const optionalText = z.string().optional().catch(undefined)

const detail = z
  .union([
    z.string(),
    z
      .object({ message: optionalText, resource: optionalText, field: optionalText, code: optionalText })
      .transform(entry => entry.message ?? [entry.resource, entry.field, entry.code].filter(part => part !== undefined).join(' ')),
  ])
  .catch('')

const reason = z
  .object({ errors: z.array(detail).optional().catch(undefined), message: optionalText })
  .transform(({ errors = [], message }) => {
    const details = errors.filter(Boolean)
    return details.length ? details.join('; ') : (message ?? '')
  })
  .catch('')

const reasonOf = (data: unknown) => reason.parse(data)

export const restError = (status: number, data: unknown) => {
  const said = reasonOf(data)
  if (status === 404) return new GitHubError("GitHub couldn't find that, or this PC's GitHub sign-in can't see it.", status)
  if (status >= 500) return new GitHubError(`GitHub is having trouble (HTTP ${status}); try again later.`, status)
  return new GitHubError(sentence(said ? `GitHub said: ${said}` : `GitHub answered HTTP ${status}`), status)
}

export const rejectedError = () => new GitHubError("GitHub didn't accept this PC's sign-in; run gh auth login on it again.")

export const unreadableError = () => new GitHubError("GitHub sent an answer sand couldn't read.")

export const reachError = (error: unknown, timeoutMs: number) => {
  if (error instanceof GitHubError) return error
  if (error instanceof Error && error.name === 'TimeoutError') return new GitHubError(`GitHub didn't answer within ${Math.round(timeoutMs / 1000)} seconds.`)
  return new GitHubError(sentence(`Couldn't reach GitHub: ${errorMessage(error)}`))
}
