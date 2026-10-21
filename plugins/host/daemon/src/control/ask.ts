import type { ServerInfo } from '@sand/host-gateway/contract'
import type { Request } from '@sand/host-hub/contract'
import { adminSocketUrl, askOnce, SocketError } from '@sand/util/boot'

const cliMessages = { timeout: 'sand did not answer', closed: 'sand did not answer', failed: 'could not reach sand' }

export const ask = async <I, O>(info: Pick<ServerInfo, 'url' | 'key'>, request: Request<I, O>, input: I, timeout?: number) => {
  try {
    return await askOnce(() => adminSocketUrl(info), request, input, timeout)
  } catch (error) {
    throw error instanceof SocketError ? new Error(cliMessages[error.kind]) : error
  }
}
