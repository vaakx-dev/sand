import type { Server } from '@sand/server/contract'
import { recordOf, type GithubRecord } from '../store'

export const sharePath = '/github/share/login'

export interface ShareSide {
  shared(): GithubRecord | undefined
  receive(record: GithubRecord, from: { id: string; name: string }): Promise<void>
}

const refuse = (text: string, status: number) => new Response(text, { status, headers: { 'content-type': 'text/plain' } })

export const serveShare = (server: Server, side: ShareSide) =>
  server.route(sharePath, async (request, caller) => {
    if (caller?.kind !== 'pc') return refuse('only paired PCs can use the GitHub login on this PC', 401)
    if (request.method === 'GET') return Response.json(side.shared() ?? {})
    if (request.method !== 'POST') return refuse('use GET or POST', 405)
    const record = recordOf(await request.json().catch(() => undefined))
    if (!record) return refuse('expected a GitHub login', 400)
    await side.receive(record, { id: caller.device, name: caller.name })
    return Response.json(side.shared() ?? {})
  })
