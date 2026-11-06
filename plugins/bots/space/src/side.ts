import { botName, type BotSummary } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { ago } from '@sand/util'
import { derive, div, dynamicChild, list, type Derive, type Sig } from '@vaakx-dev/vrui'
import { avatar } from './avatar'
import { scrollArea } from './pane'

export interface SideParts {
  bots: Derive<BotSummary[] | undefined>
  current: () => string | undefined
  narrow: Sig<boolean>
  choose(id: string): void
  create(): void
  close?: () => void
  hide?: () => void
}

const botRow = (kit: Kit, bot: Sig<BotSummary>, { current, choose }: SideParts) =>
  kit.listRow({
    current: () => current() === bot.get().id,
    touch: true,
    class: 'w-full shrink-0',
    lead: avatar(() => bot.get(), 32),
    title: () => botName(bot.get()),
    meta: () => bot.get().last?.text ?? '',
    trail: () => ago(bot.get().last?.at),
    onClick: () => choose(bot.get().id),
  })

const sideHead = ({ headTitle, icon, iconButton, paneHead }: Kit, { create, close, hide }: SideParts, drawer: boolean) =>
  paneHead(
    { led: Boolean(close) },
    close ? iconButton({ title: 'Close bots', 'aria-label': 'Close bots', onClick: close }, icon('back')) : null,
    headTitle(1, 'Bots'),
    iconButton({ title: 'New bot', 'aria-label': 'New bot', onClick: create }, icon('compose')),
    drawer && hide ? iconButton({ title: 'Show the bot', 'aria-label': 'Show the bot', onClick: hide }, icon('sidebar')) : null,
  )

const empty = ({ emptyState, secondaryAction }: Kit, create: () => void) =>
  div(
    { class: 'px-2' },
    emptyState({
      text: 'No bots yet.',
      action: secondaryAction({ size: 'sm', onClick: create }, 'New bot'),
    }),
  )

const botList = (kit: Kit, parts: SideParts) =>
  dynamicChild(
    derive(() => parts.bots.get()?.length === 0),
    none =>
      none
        ? empty(kit, parts.create)
        : scrollArea(
            kit,
            {},
            list(
              parts.bots.map(bots => bots ?? []),
              bot => bot.id,
              bot => botRow(kit, bot, parts),
              div({ class: 'flex flex-col gap-1 px-2 pb-3' }),
            ),
          ),
  )

export const sideView = (kit: Kit, parts: SideParts) =>
  kit.sideColumn(
    { narrow: parts.narrow, 'aria-label': 'Bots' },
    dynamicChild(parts.narrow, drawer => sideHead(kit, parts, drawer)),
    botList(kit, parts),
  )
