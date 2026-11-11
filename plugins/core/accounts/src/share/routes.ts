import { isRecord, joinDisposers } from '@sand/util'
import type { RouteCaller } from '@sand/host-gateway/contract'
import type { Media } from '@sand/media/contract'
import type { Server } from '@sand/server/contract'
import { type LLMRequest, type ModelInfo, rankSources, type ThreadRef } from '../contract'
import type { Accounts } from '../auth/accounts'
import type { LocalLLM } from '../local'
import { shareInfo, sharedIds, sharePaths } from './info'
import { keepCarried } from './media'
import { streamLines } from './stream'
import type { ShareUsers } from './users'

interface ShareOptions {
  local: LocalLLM
  accounts: Accounts
  users: ShareUsers
  media: Media
}

const refuse = (text: string, status = 403) => new Response(text, { status, headers: { 'content-type': 'text/plain' } })

const unpaired = () => refuse('only paired PCs can use the accounts on this PC', 401)

const isThread = (value: unknown) => value === undefined || (isRecord(value) && typeof value.id === 'string' && typeof value.generation === 'number')

const isRequest = (value: unknown): value is LLMRequest & { media?: unknown } =>
  isRecord(value) && typeof value.system === 'string' && Array.isArray(value.messages) && Array.isArray(value.tools) && isThread(value.thread)

const callerThread = (caller: RouteCaller, { id, native, ...thread }: ThreadRef): ThreadRef => ({
  ...thread,
  id: `${caller.device}:${id}`,
  ...(native && { native: { id: native.id, cwd: native.cwd } }),
})

const sharedModel = (local: LocalLLM, accounts: Accounts, wanted: string) => {
  const shared = new Set(sharedIds(accounts))
  const offered = local.view.entries().filter(entry => shared.has(entry.meta.id))
  const models = offered.flatMap(entry => entry.models)
  const billing = (source: string) => local.view.entry(source)?.meta.billing
  const named = (list: ModelInfo[]) => rankSources(list.filter(model => model.name === wanted), { billing })[0]
  return (
    models.find(model => model.id === wanted) ??
    named(models.filter(model => !model.hidden)) ??
    named(models) ??
    local.view.resolve(wanted)
  )
}

export const serveShare = (server: Server, { local, accounts, users, media }: ShareOptions) => {
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
    const { media: carried, thread, ...asked } = body
    keepCarried(media, carried)
    const sent = { ...asked, ...(thread && { thread: callerThread(caller, thread) }), model: model.id }
    return streamLines(signal => local.stream(sent, signal), request.signal)
  }

  return joinDisposers(server.route(sharePaths.info, info), server.route(sharePaths.stream, stream))
}
