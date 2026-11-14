import { botName, type BotPatch, type BotStatus, type BotSummary, type ModelChoice } from '@sand/bots/contract'
import { itemNode, itemSpot, type Row, type ShownChat } from '@sand/transcript/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, effect, list, onMount, show, untrack, type Sig } from '@vaakx-dev/vrui'
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
  shown(): boolean
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
  const states = ctx.transcriptParts.openStates()
  const surface = { conversation: id, menu, states, jump: (from: Element, text: string) => ctx.transcriptParts.quoteJump(rowList, from, text) }
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
  const { items, rows } = chatRows({ kit, parts: ctx.transcriptParts, rows: ctx.transcriptParts.rows(surface), talk, working: busy, sending: dock.sending })
  const state = derive(() => {
    if (talk.entries.get() === undefined) return talk.failure.get() ? 'failed' : 'loading'
    return rows.get().length || busy() ? 'rows' : 'empty'
  })
  const loadOlder = () => kit.loadAbove(scroller, rowList, talk.older)
  const onScroll = () => {
    follow.scrolled()
    if (scroller.scrollTop < olderEdge) void loadOlder()
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

  const loadedSpot = async (entry: string, block?: number) => {
    for (let size = -1; ; ) {
      const found = talk.path.get().find(loaded => loaded.id === entry)
      if (found) return itemSpot(items.get(), found, block)
      const loaded = talk.entries.get()?.length ?? 0
      if (loaded === size || !talk.more.get()) return undefined
      size = loaded
      await loadOlder()
    }
  }

  const reveal = async (entry: string, block?: number) => {
    const spot = await loadedSpot(entry, block)
    if (!spot) return undefined
    for (const key of spot.folds) states.get(key).open.set(true)
    return itemNode(rowList, spot.key)
  }

  const shownChat: ShownChat = {
    conversation: id,
    scroller,
    loaded: () => talk.path.get(),
    older: async () => {
      await loadOlder()
      return talk.more.get()
    },
    reveal,
  }
  effect(() => (parts.shown() && state.get() === 'rows' ? ctx.shownChats.add(shownChat) : undefined))

  const answer = (question: string) => {
    dock.quote(question)
    dock.focus()
  }

  const view = div(
    { class: 'flex min-h-0 min-w-0 flex-1 flex-col', onMount: () => talk.release },
    div({ class: 'relative flex min-h-0 flex-1 flex-col' }, scroller, kit.jumpButton(follow.away, follow.toEnd), menu.view()),
    dock.view,
  )
  return { view, answer }
}
