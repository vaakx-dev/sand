import { botName, type BotSummary } from '@sand/bots/contract'
import type { Screen } from '@sand/ui-shell/contract'
import { derive, div, list, show, type Sig } from '@vaakx-dev/vrui'
import { automationsOf, type Parts } from '../parts'
import { automationRow } from './row'

const botBlock = (parts: Parts, bot: Sig<BotSummary>) => {
  const { kit } = parts.ctx
  const menu = kit.contextMenu()
  const id = bot.get().id
  return kit.pageSection(
    {
      title: kit.plainButton(
        { class: 'rounded-md', title: `Open ${botName(bot.get())}`, onClick: () => parts.open(id) },
        () => botName(bot.get()),
      ),
    },
    list(
      derive(() => automationsOf(parts, id)),
      item => item.id,
      item => automationRow(kit, menu, item, 'page'),
      div({ class: '-mx-2 flex flex-col' }),
    ),
    menu.view(),
  )
}

export const automationsScreen = (parts: Parts): Screen => {
  const { kit } = parts.ctx
  const busy = derive(() => (parts.store.bots.get() ?? []).filter(bot => automationsOf(parts, bot.id).length))
  return {
    head: () => kit.barTitle('Automations'),
    main: () =>
      kit.pageBody(
        {},
        list(busy, bot => bot.id, bot => botBlock(parts, bot), div({ class: 'flex flex-col gap-8' })),
        show(
          () => parts.store.bots.get() !== undefined && !busy.get().length,
          () => kit.emptyState({ text: 'Nothing runs by itself yet. Ask a bot to check something on a schedule, or to watch a page or folder.', flush: true }),
        ),
      ),
  }
}
