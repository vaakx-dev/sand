import type { ToolSpec } from '@sand/llm-accounts/contract'
import type { Session } from '@sand/sessions-sqlite/contract'
import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { Meta } from './meta'
import { describeAgents } from './catalog'

const recursive = new Set(['agent', 'workflow'])

const loaded = ({ deferred: _, ...tool }: ToolSpec): ToolSpec => tool

export const restrictContext = (ctx: Context, resolve: Resolve, meta: Meta, maxDepth: number) => {
  const allows = (session: Session, tool: string) => {
    const info = meta(session)
    if (!info) return true
    return (!info.tools || info.tools.includes(tool)) && !(info.depth >= maxDepth && recursive.has(tool))
  }

  ctx.on(
    'context.build',
    async (request, session) => {
      const definitions = await resolve(session.cwd, session.project)
      const info = meta(session)
      const description = describeAgents([...definitions.values()], ctx.llm)
      const tools = request.tools
        .filter(tool => allows(session, tool.name))
        .map(tool => (tool.name === 'agent' ? { ...tool, description } : tool))
        .map(tool => (info?.tools && tool.deferred ? loaded(tool) : tool))
      return { ...request, system: info?.system ?? request.system, tools }
    },
    { priority: 50 },
  )

  ctx.on(
    'tool.before',
    (call, session) => (allows(session, call.name) ? undefined : { action: 'deny', reason: `${call.name} is not available to this agent` }),
    { priority: 1000 },
  )
}
