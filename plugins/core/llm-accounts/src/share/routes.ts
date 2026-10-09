import type { RouteCaller } from '@sand/protocol'
import type { Server } from '@sand/server/contract'
import type { LLMRequest } from '../contract'
import { accountName, type Accounts } from '../auth/accounts'
import type { LocalLLM } from '../local'
import { shareInfo, sharePaths } from './info'
import { streamLines } from './stream'
import type { ShareUsers } from './users'

export interface ShareOptions {
  local: LocalLLM
  accounts: Accounts
  users: ShareUsers
}

const refuse = (text: string, status = 403) => new Response(text, { status, headers: { 'content-type': 'text/plain' } })

const isRequest = (value: any): value is LLMRequest =>
  !!value && typeof value.system === 'string' && Array.isArray(value.messages) && Array.isArray(value.tools)

export const serveShare = (server: Server, { local, accounts, users }: ShareOptions) => {
  const guard = (caller: RouteCaller | undefined): RouteCaller | Response => {
    if (caller?.kind !== 'pc') return refuse('only paired PCs can use the accounts on this PC', 401)
    return caller
  }

  const info = async (request: Request, caller?: RouteCaller) => {
    const pc = guard(caller)
    if (pc instanceof Response) return pc
    users.seen(pc)
    if (new URL(request.url).searchParams.has('refresh')) await local.refreshLimits().catch(() => undefined)
    return Response.json(shareInfo(local, accounts))
  }

  const stream = async (request: Request, caller?: RouteCaller) => {
    const pc = guard(caller)
    if (pc instanceof Response) return pc
    if (request.method !== 'POST') return refuse('use POST', 405)
    const body = await request.json().catch(() => undefined)
    if (!isRequest(body)) return refuse('expected a model request', 400)
    const model = body.model ?? shareInfo(local, accounts).models[0]?.id
    if (!model) return refuse('this PC shares no accounts')
    const provider = local.owner(model)
    if (!accounts.shared(provider)) return refuse(`not shared: ${accountName(provider, accounts.credential(provider)?.type)}`)
    users.used(pc)
    return streamLines(signal => local.stream({ ...body, model }, signal), request.signal)
  }

  const disposers = [server.route(sharePaths.info, info), server.route(sharePaths.stream, stream)]
  return () => disposers.forEach(dispose => void dispose())
}
