import type { ToolBadge, ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { duration, oneLine } from '@sand/util'
import type { Thread, Threads } from '@sand/web-client/contract'

const firstSentence = (text: string) => oneLine(/^[^\n]*?[.!?](?=\s|$)/.exec(text.trim())?.[0] ?? text, 80)

export interface Agents {
  of(tool: ToolView): Thread | undefined
  now(): number
  open(id: string): void
  stop(id: string): void
}

export const subAgentOf = (chats: Threads | undefined, thread: string, call: string) => chats?.children(thread).find(chat => chat.info.origin === call)

export const agentRenderer = (kit: Kit, views: ToolViews, agents: Agents): ToolRenderer => {
  const failed: ToolBadge = { text: kit.statusLabel('failed'), tone: 'danger' }
  const cancelled: ToolBadge = { text: kit.statusLabel('cancelled'), tone: 'neutral' }

  const outcome = (agent: Thread) => {
    if (agent.turn || !agent.ended) return undefined
    if (agent.ended.stopReason === 'interrupted') return cancelled
    return agent.ended.error ? failed : undefined
  }

  const plainMeta = (tool: ToolView) => {
    if (tool.status === 'running') return kit.statusLabel('running')
    return tool.call.malformed ? 'malformed input' : ''
  }

  const actions = (agent: Thread): MenuAction[] => [
    { id: 'open', label: 'Open sub-agent', icon: 'right', group: 'open', tile: true, run: () => agents.open(agent.id) },
    ...(agent.turn ? [{ id: 'stop', label: 'Stop', icon: 'stop', group: 'run', danger: true, tile: true, run: () => agents.stop(agent.id) }] : []),
  ]

  return {
    icon: 'bot',
    verb: 'Agent',
    activeVerb: 'Agent',
    label: ({ call }) => views.field(call.input, 'label') || firstSentence(views.field(call.input, 'task')),
    meta(tool) {
      const agent = agents.of(tool)
      if (!agent) return plainMeta(tool)
      const took = duration((agent.turn ? agents.now() : agent.info.updated) - agent.info.created)
      return agent.turn ? `Running in background · ${took}` : `Ran in background · ${took}`
    },
    badge(tool) {
      const agent = agents.of(tool)
      if (agent) return outcome(agent)
      return tool.status === 'failed' ? failed : undefined
    },
    actions(tool) {
      const agent = agents.of(tool)
      return agent ? actions(agent) : []
    },
  }
}
