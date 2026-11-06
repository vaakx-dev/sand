import { freshColor } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { show } from '@vaakx-dev/vrui'
import type { BotStore } from '../store'
import { templateCard } from './card'
import { starter } from './start'
import { templates } from './templates'

export const firstBot = (kit: Kit, store: BotStore, open: (bot: string) => void) => (next: () => void) => {
  const { errorText, setupColumn, setupHeading, setupScreen } = kit
  const { choose, failure } = starter(store.create, bot => {
    next()
    open(bot.id)
  })
  const color = () => freshColor(store.bots.get() ?? [])
  return setupScreen(
    setupHeading('Make your first bot'),
    setupColumn(
      ...templates.filter(template => template.id !== 'blank').map(template => templateCard(kit, template, color, choose)),
      show(
        () => Boolean(failure.get()),
        () => errorText(() => failure.get()),
      ),
    ),
  )
}
