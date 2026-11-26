import { botName, botRoster, botRoute, type BotStatus, type BotSummary } from '@sand/bots/contract'
import type { Destination } from '@sand/composer/contract'
import { listedThread } from '@sand/threads-home/contract'
import type { FaceState } from '@sand/ui-kit/contract'
import type { ShellRow } from '@sand/ui-shell/contract'
import type { Thread } from '@sand/web-client/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { ShareContext } from './context'

interface Place {
  id: string
  label: string
  meta: string
  lead(): Child
  open(): Destination
}

interface Recent extends Place {
  at: number
}

const RECENT_LIMIT = 30

const FACE_STATES: Partial<Record<BotStatus, FaceState>> = { working: 'running', waiting: 'waiting' }

const projectNames = (ctx: ShareContext, projects: string[]) => projects.map(project => ctx.projects.shown({ project }).name).join(', ')

const botPlace = (ctx: ShareContext, bot: BotSummary): Recent => ({
  id: `bot:${bot.id}`,
  label: botName(bot),
  meta: ['Bot', projectNames(ctx, bot.projects)].filter(Boolean).join(' · '),
  at: bot.talked,
  lead: () => ctx.kit.botFace(bot.id, bot.color, 26, { state: FACE_STATES[bot.status] }),
  open() {
    ctx.shell.open({ kind: botRoute, id: bot.id, tab: 'chat' })
    return { conversation: bot.id, device: ctx.threads.get(bot.id)?.device ?? ctx.threads.device() }
  },
})

const threadPlace = (ctx: ShareContext, thread: Thread, row: ShellRow): Recent => ({
  id: `thread:${thread.id}`,
  label: row.label,
  meta: row.place?.label ?? '',
  at: thread.info.talked,
  lead: () => (row.status ? ctx.kit.statusIcon(row.status) : ctx.kit.stateIcon('idle')),
  open() {
    ctx.shell.open(row.to)
    return { conversation: thread.id, device: thread.device }
  },
})

const openThreads = (threads: Thread[]) => threads.filter(thread => listedThread(thread) && thread.info.head && !thread.info.archived)

const threadPlaces = (ctx: ShareContext) =>
  openThreads(ctx.threads.list()).flatMap(thread => {
    const row = ctx.threadRows.row(thread.id)
    return row ? [threadPlace(ctx, thread, row)] : []
  })

const botPlaces = (ctx: ShareContext) => (ctx.get(botRoster)?.list() ?? []).map(bot => botPlace(ctx, bot))

const newThreadPlace = (ctx: ShareContext): Place => {
  const { path, device } = ctx.newThreads.place()
  const project = ctx.projects.shown({ path, device })
  return {
    id: 'new-thread',
    label: 'New thread',
    meta: project.quick ? project.name : `In ${project.name}`,
    lead: () => ctx.kit.icon('compose'),
    open() {
      const draft = ctx.newThreads.open()
      return { conversation: draft.id, device: draft.device, draft }
    },
  }
}

const matches = (words: string[]) => ({ label, meta }: Pick<Recent, 'label' | 'meta'>) => {
  const text = `${label} ${meta}`.toLowerCase()
  return words.every(word => text.includes(word))
}

const recent = <T extends Pick<Recent, 'label' | 'meta' | 'at'>>(places: T[], query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return places
    .filter(matches(words))
    .toSorted((one, other) => other.at - one.at)
    .slice(0, RECENT_LIMIT)
}

const recentPlaces = (ctx: ShareContext, query: string) => recent([...botPlaces(ctx), ...threadPlaces(ctx)], query)

export { newThreadPlace, recent, recentPlaces, type Place, type Recent }
