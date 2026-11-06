import type { Conversation } from '@sand/engine/contract'
import type { Need, Tool } from '../contract'

export const inScope = (tools: Tool[], conversation: Conversation, offered: readonly Need[]) => {
  const met = (tool: Tool) => (tool.needs ?? []).every(need => offered.includes(need))
  const active = tools.filter(tool => met(tool) && (!tool.active || tool.active(conversation)))
  return active.filter(tool => !active.some(other => other !== tool && other.replaces?.includes(tool.name)))
}
