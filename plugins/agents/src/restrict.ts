import type { AgentDefinition } from '@sand/protocol'
import type { Context } from 'drydock'
import type { Meta } from './meta'

const recursive = new Set(['agent', 'workflow'])

export const restrictContext = (ctx: Context, definitions: Map<string, AgentDefinition>, meta: Meta, maxDepth: number) =>
  ctx.on(
    'context.build',
    (request, session) => {
      const info = meta(session)
      const allowed = info && definitions.get(info.name)?.tools
      const atLimit = (info?.depth ?? 0) >= maxDepth
      const tools = request.tools.filter(
        tool => (!allowed || allowed.includes(tool.name)) && !(atLimit && recursive.has(tool.name)),
      )
      return { ...request, system: info?.system ?? request.system, tools }
    },
    { priority: 50 },
  )
