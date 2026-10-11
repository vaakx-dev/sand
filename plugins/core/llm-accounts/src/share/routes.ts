import { isRecord, joinDisposers } from '@sand/kit'
import type { RouteCaller } from '@sand/protocol'
import type { Server } from '@sand/server/contract'
import type { LLMRequest } from '../contract'
import type { Accounts } from '../auth/accounts'
import type { LocalLLM } from '../local'
import { shareInfo, sharedIds, sharePaths } from './info'
import { streamLines } from './stream'
import type { ShareUsers } from './users'

interface ShareOptions {
  local: LocalLLM
  accounts: Accounts
  users: ShareUsers
}

const refuse = (text: string, status = 403) => new Response(text, { status, headers: { 'content-type': 'text/plain' } })

const unpaired = () => refuse('only paired PCs can use the accounts on this PC', 401)

const isRequest = (value: unknown): value is LLMRequest =>
  isRecord(value) && typeof value.system === 'string' && Array.isArray(value.messages) && Array.isArray(value.tools)

const sharedModel = (local: LocalLLM, accounts: Accounts, wanted: string) => {
  const shared = new Set(sharedIds(accounts))
  const offered = local.view.entries().filter(entry => shared.has(entry.meta.id))
  const models = offered.flatMap(entry => entry.models)
  return (
    models.find(model => model.id === wanted) ??
    models.find(model => !model.hidden && model.name === wanted) ??
    models.find(model => model.name === wanted) ??
    local.view.resolve(wanted)
  )
}

export const serveShare = (server: Server, { local, accounts, users }: ShareOptions) => {
  const info = async (request: Request, caller?: RouteCaller) => {
    if (caller?.kind !== 'pc') return unpaired()
    users.seen(caller)
    if (new URL(request.url).searchParams.has('refresh')) await local.refreshLimits().catch(() => undefined)
    return Response.json(shareInfo(local, accounts))
  }

  const stream = async (request: Request, caller?: RouteCaller) => {
    if (caller?.kind !== 'pc') return unpaired()
    if (request.method !== 'POST') return refuse('use POST', 405)
    const body = await request.json().catch(() => undefined)
    if (!isRequest(body)) return refuse('expected a model request', 400)
    if (!body.model) return refuse('name a model', 400)
    const model = sharedModel(local, accounts, body.model)
    if (!model?.source) return refuse(`unknown model: ${body.model}`)
    if (!accounts.shared(model.source)) return refuse(`not shared: ${accounts.label(model.source)}`)
    users.used(caller)
    return streamLines(signal => local.stream({ ...body, model: model.id }, signal), request.signal)
  }

  return joinDisposers(server.route(sharePaths.info, info), server.route(sharePaths.stream, stream))
}
