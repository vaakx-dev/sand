import type { ServerInfo, WireRequest } from '@sand/protocol'
import { adminSocketUrl, askOnce, SocketError } from '@sand/kit/host'

const cliMessages = { timeout: 'sand did not answer', closed: 'sand did not answer', failed: 'could not reach sand' }

export const ask = async <T>(info: Pick<ServerInfo, 'url' | 'key'>, request: WireRequest, timeout?: number) => {
  try {
    return (await askOnce(() => adminSocketUrl(info), request, timeout)) as T
  } catch (error) {
    throw error instanceof SocketError ? new Error(cliMessages[error.kind]) : error
  }
}
