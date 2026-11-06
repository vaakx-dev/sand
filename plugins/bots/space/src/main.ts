import { approvalViews } from '@sand/approvals/contract'
import type { BotProfileSection, BotSummary, ModelChoice } from '@sand/bots/contract'
import type { ModelPicker } from '@sand/model-picker/contract'
import { derive, div, dynamicChild, effect, list, media, sig, untrack, type Derive, type Sig } from '@vaakx-dev/vrui'
import { newBot, type Address, type Route } from './address'
import { conversation } from './chat/conversation'
import { chatView } from './chat/view'
import type { BotsContext } from './context'
import { createView } from './create/view'
import { pane, paneHead, type HeadParts } from './pane'
import { profileView } from './profile/view'
import type { BotStore } from './store'

export type Page = { kind: 'loading' } | { kind: 'new' } | { kind: 'chat' | 'profile'; bot: BotSummary }

export const pageOf = ({ bot, profile }: Route, bots: BotSummary[] | undefined): Page => {
  if (!bots) return { kind: 'loading' }
  if (bot === newBot) return { kind: 'new' }
  const found = bots.find(candidate => candidate.id === bot)
  if (found) return { kind: profile ? 'profile' : 'chat', bot: found }
  const first = bots[0]
  return first ? { kind: 'chat', bot: first } : { kind: 'new' }
}

const remembered = (kept: BotSummary[], shown: BotSummary | undefined, alive: Set<string>, size: number) => {
  const others = kept.filter(bot => bot.id !== shown?.id && alive.has(bot.id))
  return [...others, ...(shown ? [shown] : [])].slice(-size)
}

const ids = (bots: BotSummary[]) => bots.map(bot => bot.id).join()

export interface MainParts extends Omit<HeadParts, 'close'> {
  ctx: BotsContext
  store: BotStore
  address: Address
  page: Derive<Page>
  picker: Derive<ModelPicker | undefined>
  defaults: Derive<ModelChoice>
  sections: Sig<BotProfileSection[]>
}

const keyOf = (page: Page) => (page.kind === 'profile' ? `${page.kind}:${page.bot.id}` : page.kind)

const loading = ({ ctx }: MainParts, head: HeadParts) =>
  pane({}, paneHead(ctx.kit, head, ctx.kit.headTitle(1, 'Bots')), div({ class: 'px-4 py-4' }, ctx.kit.loadingState()))

const latest = (store: BotStore, shown: BotSummary) => () => store.find(shown.id) ?? shown

const chatPage = ({ ctx, store, address }: MainParts, head: HeadParts, shown: BotSummary) => {
  const approvals = ctx.get(approvalViews)?.banner('bot', shown.id)
  return chatView(ctx.kit, {
    ...head,
    bot: latest(store, shown),
    talk: conversation(ctx, shown.id),
    transcript: ctx.transcriptParts,
    composer: ctx.composer,
    profile: () => address.profile(shown.id),
    ...(approvals && { approvals }),
  })
}

const chats = (parts: MainParts, head: HeadParts) => {
  const phone = media('(max-width: 767px)')
  const shown = derive(() => {
    const page = parts.page.get()
    return page.kind === 'chat' ? page.bot : undefined
  })
  const kept = sig<BotSummary[]>([])
  effect(() => {
    const alive = new Set(parts.store.bots.get()?.map(bot => bot.id))
    const before = untrack(() => kept.get())
    const next = remembered(before, shown.get(), alive, phone.get() ? 2 : 6)
    if (ids(next) !== ids(before)) kept.set(next)
  })
  return list(
    kept,
    bot => bot.id,
    bot => {
      const first = untrack(() => bot.get())
      return div({ class: 'contents', hidden: () => shown.get()?.id !== first.id }, chatPage(parts, head, first))
    },
    div({ class: 'contents' }),
  )
}

const render = (parts: MainParts, head: HeadParts, page: Page) => {
  const { ctx, store, address } = parts
  if (page.kind === 'loading') return loading(parts, head)
  if (page.kind === 'new') return createView(ctx.kit, { ...head, bots: store.bots, create: store.create, created: bot => address.show(bot.id) })
  if (page.kind === 'chat') return null
  const id = page.bot.id
  return profileView(ctx, {
    ...head,
    bot: latest(store, page.bot),
    picker: parts.picker,
    defaults: parts.defaults,
    sections: parts.sections,
    save: patch => store.update(id, patch),
    chat: address.chat,
    discard: () => store.remove(id).then(() => address.show(store.bots.get()?.[0]?.id ?? newBot)),
  })
}

export const mainView = (parts: MainParts, close?: () => void) => {
  const head: HeadParts = { narrow: parts.narrow, showSide: parts.showSide, ...(close && { close }) }
  return div(
    { class: 'contents' },
    chats(parts, head),
    dynamicChild(derive(() => keyOf(parts.page.get())), () => render(parts, head, parts.page.get())),
  )
}
