import type { Session } from '@sand/chats/contract'
import type { Tool } from '../contract'

export const inScope = (tools: Tool[], session: Session) => {
  const active = tools.filter(tool => !tool.active || tool.active(session))
  return active.filter(tool => !active.some(other => other !== tool && other.replaces?.includes(tool.name)))
}
