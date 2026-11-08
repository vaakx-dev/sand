import { botName, type BotSummary } from '@sand/bots/contract'
import type { Screen } from '@sand/ui-shell/contract'
import { derive, div, list, section, show, type Sig } from '@vaakx-dev/vrui'
import { botMark } from '../marks'
import { automationsOf, type Parts } from '../parts'
import { automationRow } from './row'

const botBlock = (parts: Parts, bot: Sig<BotSummary>) => {
  const { kit } = parts.ctx
  const menu = kit.contextMenu()
  const id = bot.get().id
  return section(
    { class: 'flex flex-col gap-1' },
    kit.plainButton(
      { class: 'flex min-h-8 items-center gap-2 self-start rounded-md px-2', title: 'Open', onClick: () => parts.open(id) },
      botMark(kit, () => bot.get()),
      kit.headTitle(2, () => botName(bot.get())),
    ),
    list(
      derive(() => automationsOf(parts, id)),
      item => item.id,
      item => automationRow(kit, menu, item, 'page'),
      div({ class: 'flex flex-col' }),
    ),
    menu.view(),
  )
}

export const automationsScreen = (parts: Parts): Screen => {
  const { kit } = parts.ctx
  const busy = derive(() => (parts.store.bots.get() ?? []).filter(bot => automationsOf(parts, bot.id).length))
  return {
    head: () => kit.headTitle(1, 'Automations'),
    main: () =>
      div(
        { class: 'min-h-0 flex-1 overflow-y-auto overscroll-contain' },
        div(
          { class: [kit.pageColumn, 'flex flex-col gap-6 px-2 py-5'] },
          list(busy, bot => bot.id, bot => botBlock(parts, bot), div({ class: 'flex flex-col gap-6' })),
          show(
            () => parts.store.bots.get() !== undefined && !busy.get().length,
            () => div({ class: 'px-2' }, kit.emptyState({ text: 'Nothing runs by itself yet. Ask a bot to check something on a schedule, or to watch a page or folder.', flush: true })),
          ),
        ),
      ),
  }
}
