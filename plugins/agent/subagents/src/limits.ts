import type { AgentLimits } from './contract'
import type { Meta } from './meta'

const narrowed = (inherited: string[] | undefined, own: string[] | undefined) => {
  if (!inherited) return own
  return own ? own.filter(tool => inherited.includes(tool)) : inherited
}

export const createLimits = (meta: Meta, maxDepth: number): AgentLimits => ({
  child(parent, name, own) {
    const inherited = meta(parent)
    const depth = (inherited?.depth ?? 0) + 1
    if (depth > maxDepth) throw new Error(`Agents can only nest ${maxDepth} levels deep`)
    const tools = narrowed(inherited?.tools, own)
    return { name, depth, ...(tools && { tools }) }
  },
  give: (session, limits) => void session.append('agent', limits),
  covers(caller, target) {
    const allowed = meta(caller)?.tools
    return !allowed || Boolean(meta(target)?.tools?.every(tool => allowed.includes(tool)))
  },
})
