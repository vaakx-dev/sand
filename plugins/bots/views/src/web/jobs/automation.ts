import type { BotAutomation } from '@sand/bots/contract'
import type { ContextMenu, Kit, Surface } from '@sand/ui-kit/contract'
import { span, type Sig } from '@vaakx-dev/vrui'

const noteOf = ({ when, detail, paused, error }: BotAutomation) => error ?? [paused ? `Paused · ${when}` : when, detail].filter(Boolean).join(' · ')

export const automationRow = (kit: Kit, menu: ContextMenu, automation: Sig<BotAutomation>, surface: Surface) => {
  const spec = () => ({ title: automation.get().title, actions: automation.get().actions() })
  return kit.listRow({
    ...menu.target(spec, event => menu.openBelow(event, spec)),
    'aria-haspopup': 'menu',
    surface,
    lead: kit.icon(automation.get().icon, 'sm'),
    title: span({ class: () => (automation.get().paused ? 'text-neutral-400' : '') }, () => automation.get().title),
    meta: span({ class: () => (automation.get().error ? kit.toneText.danger : '') }, () => noteOf(automation.get())),
  })
}
