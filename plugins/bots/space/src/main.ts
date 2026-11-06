import { approvalViews } from '@sand/approvals/contract'
import type { Shelves } from '@sand/attachments/web/contract'
import type { BotProfileSection, BotSummary, ModelChoice } from '@sand/bots/contract'
import type { ModelPicker } from '@sand/model-picker/contract'
import { derive, div, dynamicChild, type Derive, type Sig } from '@vaakx-dev/vrui'
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

export interface MainParts extends Omit<HeadParts, 'close'> {
  ctx: BotsContext
  store: BotStore
  address: Address
  page: Derive<Page>
  shelves: Derive<Shelves | undefined>
  picker: Derive<ModelPicker | undefined>
  defaults: Derive<ModelChoice>
  sections: Sig<BotProfileSection[]>
}

const keyOf = (page: Page) => (page.kind === 'chat' || page.kind === 'profile' ? `${page.kind}:${page.bot.id}` : page.kind)

const loading = ({ ctx }: MainParts, head: HeadParts) =>
  pane({}, paneHead(ctx.kit, head, ctx.kit.headTitle(1, 'Bots')), div({ class: 'px-4 py-4' }, ctx.kit.loadingState()))

const latest = (store: BotStore, shown: BotSummary) => () => store.find(shown.id) ?? shown

const render = (parts: MainParts, head: HeadParts, page: Page) => {
  const { ctx, store, address } = parts
  if (page.kind === 'loading') return loading(parts, head)
  if (page.kind === 'new') return createView(ctx.kit, { ...head, bots: store.bots, create: store.create, created: bot => address.show(bot.id) })
  const id = page.bot.id
  const bot = latest(store, page.bot)
  if (page.kind === 'chat') {
    const approvals = ctx.get(approvalViews)?.card('bot', id)
    return chatView(ctx.kit, { ...head, bot, talk: conversation(ctx, id), transcript: ctx.transcriptParts, shelves: parts.shelves, profile: address.profile, ...(approvals && { approvals }) })
  }
  return profileView(ctx, {
    ...head,
    bot,
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
  return dynamicChild(derive(() => keyOf(parts.page.get())), () => render(parts, head, parts.page.get()))
}
