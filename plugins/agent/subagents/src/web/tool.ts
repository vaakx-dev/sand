import type { ToolBadge, ToolRenderer, ToolView, ToolViews } from '@sand/chat/contract'
import type { JobState } from '@sand/jobs/contract'
import type { NavAction } from '@sand/nav/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { duration, oneLine } from '@sand/util'
import type { Threads } from '@sand/web-client/contract'
import type { JobWatch } from './jobs'

const firstSentence = (text: string) => oneLine(/^[^\n]*?[.!?](?=\s|$)/.exec(text.trim())?.[0] ?? text, 80)

export const subAgentOf = (chats: Threads | undefined, thread: string, call: string) => chats?.children(thread).find(chat => chat.info.origin === call)

export const agentRenderer = (kit: Kit, views: ToolViews, watch: JobWatch, chats: () => Threads | undefined): ToolRenderer => {
  const outcomes: Record<Exclude<JobState['status'], 'running'>, ToolBadge> = {
    done: { text: kit.statusLabel('done'), tone: 'success' },
    failed: { text: kit.statusLabel('failed'), tone: 'danger' },
    cancelled: { text: kit.statusLabel('cancelled'), tone: 'neutral' },
  }

  const plainMeta = (tool: ToolView) => {
    if (tool.status === 'running') return kit.statusLabel('running')
    if (!tool.result) return tool.call.malformed ? 'malformed input' : ''
    if (tool.result.isError) return ''
    const lines = views.resultText(tool.result).split('\n')
    return lines.length > 1 ? `${lines.length} lines` : ''
  }

  const plainBadge = (tool: ToolView): ToolBadge | undefined => (tool.status === 'failed' ? { text: kit.statusLabel('failed'), tone: 'danger' } : undefined)

  const stop = (job: JobState): NavAction => ({ id: 'stop', label: 'Stop', icon: 'stop', group: 'run', danger: true, tile: true, run: () => watch.cancel(job.id) })

  const open = (tool: ToolView): NavAction[] => {
    const chat = subAgentOf(chats(), tool.thread, tool.call.id)
    return chat ? [{ id: 'open', label: 'Open sub-agent', icon: 'right', group: 'open', tile: true, run: () => chats()?.select(chat.id) }] : []
  }

  return {
    icon: 'bot',
    verb: 'Agent',
    activeVerb: 'Agent',
    label: ({ call }) => views.field(call.input, 'label') || firstSentence(views.field(call.input, 'task')),
    meta(tool) {
      watch.tick()
      const job = watch.of(tool.call.id)
      return job ? `in background · ${duration((job.ended ?? Date.now()) - job.started)}` : plainMeta(tool)
    },
    badge(tool) {
      const job = watch.of(tool.call.id)
      return job && job.status !== 'running' ? outcomes[job.status] : plainBadge(tool)
    },
    actions(tool) {
      const job = watch.of(tool.call.id)
      return [...open(tool), ...(job?.status === 'running' ? [stop(job)] : [])]
    },
  }
}
