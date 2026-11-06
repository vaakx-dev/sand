import { freshColor } from '@sand/bots/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { show, sig } from '@vaakx-dev/vrui'
import type { BotStore } from '../store'
import { templateCard } from './card'
import { templates, type Template } from './templates'

export const firstBot = (kit: Kit, store: BotStore, open: (bot: string) => void) => (next: () => void) => {
  const { errorText, setupColumn, setupHeading, setupScreen } = kit
  const creating = sig(false)
  const failure = sig('')
  const color = () => freshColor(store.bots.get() ?? [])
  const choose = ({ start }: Template) => {
    if (creating.get()) return
    creating.set(true)
    store.create(start).then(
      bot => {
        next()
        open(bot.id)
      },
      error => {
        creating.set(false)
        failure.set(errorMessage(error))
      },
    )
  }
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
