import type { Session, ToolCallBlock, ToolResultBlock } from '@sand/chats/contract'
import { textOf } from '@sand/chats/prompt'
import { isDismissed } from '../links/edit'
import type { ThreadLinks } from '../links/links'
import { isLive } from '../links/thread'
import { createdPulls } from './parse'

const commandOf = ({ input }: ToolCallBlock) => {
  const command = input && typeof input === 'object' && 'command' in input ? input.command : undefined
  return typeof command === 'string' ? command : undefined
}

export const linkCreatedInShell = (links: ThreadLinks, report: (error: unknown) => void) => (result: ToolResultBlock, call: ToolCallBlock, session: Session) => {
  const command = commandOf(call)
  const pulls = command ? createdPulls(command, textOf(result.content)) : []
  if (!pulls.length) return
  const thread = links.thread(session.id)
  if (!isLive(thread)) return
  const stored = links.read(thread.id)
  for (const pull of pulls) if (!isDismissed(stored, pull)) links.link(thread.id, pull, 'created').catch(report)
}
