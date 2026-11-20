import type { ToolSpec } from '@sand/accounts/contract'
import type { Conversation } from '@sand/engine/contract'
import type { Act } from '@sand/tools/contract'
import { stepTools } from '@sand/turns-contract/contract'
import { describeAgents } from './catalog'
import type { AgentsContext } from './context'
import type { Resolve } from './layers'
import type { Meta } from './meta'

const recursive = new Set(['agent'])

const unrestricted = new Set(['history_read'])

const loaded = ({ deferred: _, ...tool }: ToolSpec): ToolSpec => tool

export const restrictContext = (ctx: AgentsContext, resolve: Resolve, meta: Meta, maxDepth: number) => {
  const allows = (tool: string, conversation: Conversation, act?: Act) => {
    const info = meta(conversation)
    if (!info || unrestricted.has(tool)) return true
    const permitted = !info.tools || info.tools.includes(tool)
    const reachable = !(info.depth >= maxDepth && recursive.has(tool))
    const readOnly = info.role !== 'finder' || !act || act.effect === 'read'
    return permitted && reachable && readOnly
  }

  ctx.effect(() => ctx.tools.restrict(allows))

  ctx.on(
    stepTools,
    async (tools, session) => {
      const definitions = await resolve(session.cwd, session.project)
      const info = meta(session)
      const description = describeAgents([...definitions.values()])
      return tools.map(tool => (tool.name === 'agent' ? { ...tool, description } : tool)).map(tool => (info?.tools && tool.deferred ? loaded(tool) : tool))
    },
    { priority: 50 },
  )
}
