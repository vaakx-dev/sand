import type { Context } from 'drydock'
import type { Resolve } from './layers'
import type { Meta } from './meta'
import { describeAgents } from './tool'

const recursive = new Set(['agent', 'workflow'])

export const restrictContext = (ctx: Context, resolve: Resolve, meta: Meta, maxDepth: number) =>
  ctx.on(
    'context.build',
    async (request, session) => {
      const definitions = await resolve(session.cwd, session.project)
      const info = meta(session)
      const allowed = info && definitions.get(info.name)?.tools
      const atLimit = (info?.depth ?? 0) >= maxDepth
      const description = describeAgents([...definitions.values()], ctx.llm)
      const tools = request.tools
        .filter(tool => (!allowed || allowed.includes(tool.name)) && !(atLimit && recursive.has(tool.name)))
        .map(tool => (tool.name === 'agent' ? { ...tool, description } : tool))
      return { ...request, system: info?.system ?? request.system, tools }
    },
    { priority: 50 },
  )
