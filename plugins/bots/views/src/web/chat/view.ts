import { botName, type BotPatch, type BotStatus, type BotSummary, type ModelChoice } from '@sand/bots/contract'
import type { Row } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, onMount, show, untrack, type Sig } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'
import { applyChoice, effective } from '../models'
import type { Conversation } from './conversation'
import { holdSlot } from './hold'
import { chatRows } from './rows'

export interface ChatParts {
  ctx: BotsContext
  id: string
  talk: Conversation
  bot: () => BotSummary | undefined
  profile(): void
  resume(): void
  save(patch: BotPatch): void
  defaults(): ModelChoice
  advanced(): boolean
}

const olderEdge = 240

const working = (status: BotStatus | undefined) => status === 'working' || status === 'waiting'

const statusView = (kit: Kit, talk: Conversation, status: () => BotStatus | undefined) => {
  const last = derive(() => talk.live.get().at(-1))
  const doing = derive(() => {
    const block = last.get()
    return block?.type === 'tool' ? `Using ${block.name}` : 'Thinking'
  })
  const line = derive(() => {
    const current = status()
    if (current === 'waiting') return current
    return current === 'working' && last.get()?.type !== 'text' ? current : undefined
  })
  return dynamicChild(line, shown => {
    if (!shown) return null
    const text = shown === 'waiting' ? 'Needs you' : doing
    return div({ class: 'mb-3' }, kit.statusLine({ mark: shown === 'waiting' ? kit.stateIcon('waiting', 'sm', true) : kit.spinner('sm'), text, title: text }))
  })
}

const emptyChat = (kit: Kit, bot: () => BotSummary | undefined) =>
  kit.emptyState({ text: () => (bot()?.jobs.length ? 'No messages yet.' : 'No messages yet. Say what it should take care of.') })

const stateView = (kit: Kit, talk: Conversation, bot: () => BotSummary | undefined, state: 'loading' | 'failed' | 'empty') => {
  if (state === 'empty') return emptyChat(kit, bot)
  return state === 'loading' ? kit.loadingState() : kit.errorState({ text: () => talk.failure.get() ?? '', retry: talk.retry })
}

export const chatView = (parts: ChatParts) => {
  const { ctx, id, talk, bot } = parts
  const { kit } = ctx
  const status = () => bot()?.status
  const busy = () => working(status())
  const menu = kit.contextMenu()
  const rowList = div({ class: 'pb-6' })
  const quote = ctx.transcriptParts.quoteJump(rowList)
  const surface = { conversation: id, menu, states: ctx.transcriptParts.openStates(), jump: (from: Element, text: string) => quote(rowList, from, text) }
  const dock = ctx.composer.dock(
    {
      ref: { owner: 'bot', id },
      name: () => botName(bot() ?? { name: '' }),
      skills: { bot: id },
      running: busy,
      path: () => talk.path.get(),
      send: talk.send,
      interrupt: talk.interrupt,
      settings: () => effective(bot()?.models.main ?? {}, parts.defaults()),
      choose: patch => {
        const models = bot()?.models
        if (models) parts.save({ models: { ...models, main: applyChoice(models.main, patch) } })
      },
    },
    { placeholder: () => `Message ${botName(bot() ?? { name: '' })}` },
  )
  dock.slot('above', () => ctx.shell.chipBar({ owner: id }))
  const rows = chatRows({ kit, parts: ctx.transcriptParts, rows: ctx.transcriptParts.rows(surface), talk, working: busy, sending: dock.sending })
  const state = derive(() => {
    if (talk.entries.get() === undefined) return talk.failure.get() ? 'failed' : 'loading'
    return rows.get().length || busy() ? 'rows' : 'empty'
  })
  const onScroll = () => {
    follow.scrolled()
    if (scroller.scrollTop < olderEdge) void kit.loadAbove(scroller, rowList, talk.older)
  }
  const watched = (node: HTMLElement) => {
    onMount(node, () => follow.watch(node))
    return node
  }
  const rowNode = (row: Sig<Row>) => watched(untrack(() => row.get()).view(row.map(value => value.data)))

  const scroller: HTMLElement = div(
    { class: 'relative z-0 min-h-0 flex-1 overflow-auto overscroll-contain', onScroll },
    kit.topFade(),
    div(
      { class: 'flex min-h-full flex-col' },
      show(
        () => talk.loading.get() && talk.more.get(),
        () => div({ class: 'flex justify-center py-2 text-neutral-500' }, kit.spinner('sm')),
      ),
      dynamicChild(state, shown => (shown === 'rows' ? null : div({ class: [kit.pageColumn, 'px-4 py-4'] }, stateView(kit, talk, bot, shown)))),
      div(
        { class: [kit.pageColumn, 'flex flex-col px-4 pt-4'], hidden: () => state.get() !== 'rows' },
        list(rows, row => row.key, rowNode, rowList),
        watched(div(statusView(kit, talk, status))),
      ),
      kit.dockFade(),
    ),
  )
  const follow = kit.followEnd(scroller)

  holdSlot(kit, { bot, resume: parts.resume, profile: parts.profile }, dock)

  const rowOf = (entry: string) => rowList.querySelector(`[data-entry="${CSS.escape(entry)}"]`)

  const reveal = async (entry: string) => {
    while (!rowOf(entry) && talk.more.get()) {
      const shown = talk.entries.get()?.length
      await talk.older()
      if (talk.entries.get()?.length === shown) break
    }
    rowOf(entry)?.scrollIntoView({ block: 'center' })
  }

  const answer = (question: string) => {
    dock.quote(question)
    dock.focus()
  }

  const view = div(
    { class: 'flex min-h-0 min-w-0 flex-1 flex-col', onMount: () => talk.release },
    div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, kit.jumpButton(follow.away, follow.toEnd), menu.view()),
    dock.view,
  )
  return { view, reveal, answer }
}
