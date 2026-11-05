import type { ToolSpec } from '@sand/accounts/contract'
import { llm } from '@sand/accounts/contract'
import type { Session } from '@sand/chats/contract'
import { stepTools } from '@sand/turns-contract/contract'
import type { Context } from 'drydock'
import { describeAgents } from './catalog'
import type { Resolve } from './layers'
import type { Meta } from './meta'

const recursive = new Set(['agent'])

const unrestricted = new Set(['thread_read'])

const loaded = ({ deferred: _, ...tool }: ToolSpec): ToolSpec => tool

export const restrictContext = (ctx: Context, resolve: Resolve, meta: Meta, maxDepth: number) => {
  const allows = (session: Session, tool: string) => {
    const info = meta(session)
    if (!info || unrestricted.has(tool)) return true
    return (!info.tools || info.tools.includes(tool)) && !(info.depth >= maxDepth && recursive.has(tool))
  }

  ctx.on(
    stepTools,
    async (tools, session) => {
      const definitions = await resolve(session.cwd, session.project)
      const info = meta(session)
      const description = describeAgents([...definitions.values()], ctx.get(llm))
      return tools
        .filter(tool => allows(session, tool.name))
        .map(tool => (tool.name === 'agent' ? { ...tool, description } : tool))
        .map(tool => (info?.tools && tool.deferred ? loaded(tool) : tool))
    },
    { priority: 50 },
  )
}
