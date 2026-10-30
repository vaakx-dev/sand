import type { ServerInfo } from '@sand/host-gateway/contract'
import type { Request } from '@sand/host-hub/contract'
import { openLink } from './link'

export const ask = async <I, O>(home: string, info: Pick<ServerInfo, 'url'>, request: Request<I, O>, input: I, timeout?: number) => {
  const link = await openLink(home, info.url)
  try {
    return await link.call(request, input, { timeout })
  } finally {
    link.close()
  }
}
