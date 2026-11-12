import type { ToolBadge, ToolRenderer, ToolView, ToolViews } from '@sand/transcript/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { duration, oneLine } from '@sand/util'
import type { Thread } from '@sand/web-client/contract'
import type { ChildWatch } from './children'

const firstSentence = (text: string) => oneLine(/^[^\n]*?[.!?](?=\s|$)/.exec(text.trim())?.[0] ?? text, 80)

export interface ChildActions {
  open(thread: string): void
  stop(thread: string): void
}

export const agentRenderer = (kit: Kit, views: ToolViews, watch: ChildWatch, act: ChildActions): ToolRenderer => {
  const childOf = (tool: ToolView) => watch.of(tool.thread, tool.call.id)

  const plainMeta = (tool: ToolView) => {
    if (tool.status === 'running') return kit.statusLabel('running')
    return tool.call.malformed ? 'malformed input' : ''
  }

  const outcome = ({ running, ended }: Thread): ToolBadge | undefined => {
    if (running || !ended) return undefined
    if (ended.stopReason === 'error') return { text: kit.statusLabel('failed'), tone: 'danger' }
    if (ended.stopReason === 'interrupted') return { text: kit.statusLabel('cancelled'), tone: 'neutral' }
  }

  const plainBadge = (tool: ToolView): ToolBadge | undefined => (tool.status === 'failed' ? { text: kit.statusLabel('failed'), tone: 'danger' } : undefined)

  const open = (child: Thread): MenuAction => ({ id: 'open', label: 'Open subagent', icon: 'right', group: 'open', tile: true, run: () => act.open(child.id) })

  const stop = (child: Thread): MenuAction => ({ id: 'stop', label: 'Stop', icon: 'stop', group: 'run', danger: true, tile: true, run: () => act.stop(child.id) })

  return {
    icon: 'bot',
    verb: 'Agent',
    activeVerb: 'Agent',
    label: ({ call }) => views.field(call.input, 'label') || firstSentence(views.field(call.input, 'task')),
    meta(tool) {
      watch.tick()
      const child = childOf(tool)
      if (!child) return plainMeta(tool)
      if (!child.running) return ''
      return `Running · ${duration(Date.now() - (child.started ?? child.info.created))}`
    },
    badge(tool) {
      const child = childOf(tool)
      return child ? outcome(child) : plainBadge(tool)
    },
    actions(tool) {
      const child = childOf(tool)
      return child ? [open(child), ...(child.running ? [stop(child)] : [])] : []
    },
  }
}
