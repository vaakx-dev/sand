import { AccountError, rawMessage } from './errors'
import { ApiError } from './http/error'

const origin = (url: string) => {
  try {
    return new URL(url).origin
  } catch {
    return url
  }
}

export const reaching = async <T>(url: string, provider: string, signal: AbortSignal | undefined, run: () => Promise<T>): Promise<T> => {
  try {
    return await run()
  } catch (error) {
    if (signal?.aborted || error instanceof ApiError || (error instanceof Error && error.name === 'AbortError')) throw error
    throw new AccountError(`Couldn't reach ${origin(url)} for ${provider}`, `${url} · ${rawMessage(error)}`)
  }
}
