import type { ToolSpec } from '@sand/accounts/contract'
import { llm } from '@sand/accounts/contract'
import type { Conversation } from '@sand/engine/contract'
import { stepTools } from '@sand/turns-contract/contract'
import { describeAgents } from './catalog'
import type { AgentsContext } from './context'
import type { Resolve } from './layers'
import type { Meta } from './meta'

const recursive = new Set(['agent'])

const unrestricted = new Set(['history_read'])

const loaded = ({ deferred: _, ...tool }: ToolSpec): ToolSpec => tool

export const restrictContext = (ctx: AgentsContext, resolve: Resolve, meta: Meta, maxDepth: number) => {
  const allows = (tool: string, conversation: Conversation) => {
    const info = meta(conversation)
    if (!info || unrestricted.has(tool)) return true
    return (!info.tools || info.tools.includes(tool)) && !(info.depth >= maxDepth && recursive.has(tool))
  }

  ctx.effect(() => ctx.tools.restrict(allows))

  ctx.on(
    stepTools,
    async (tools, session) => {
      const definitions = await resolve(session.cwd, session.project)
      const info = meta(session)
      const description = describeAgents([...definitions.values()], ctx.get(llm))
      return tools.map(tool => (tool.name === 'agent' ? { ...tool, description } : tool)).map(tool => (info?.tools && tool.deferred ? loaded(tool) : tool))
    },
    { priority: 50 },
  )
}
