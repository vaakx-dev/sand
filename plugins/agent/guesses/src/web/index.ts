import { composer } from '@sand/composer/contract'
import { wire, wireHello } from '@sand/devices-contract'
import { settings } from '@sand/settings/contract'
import { kit } from '@sand/ui-kit/contract'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { guessesChange, guessesSet, helloGuesses } from '../contract'
import { createGuesses } from './guesses'

export default definePlugin({
  name: 'guesses-web',
  description: 'Offers the guessed next message in the empty composer, and the switch for it in Settings › Add-ons',
  inject: { wire, composer, kit },
  apply(ctx) {
    const helloOn = () => ctx.wire.hello(helloGuesses)?.on ?? false
    const on = sig(helloOn())
    const guesses = createGuesses(ctx.wire)

    const choose = (next: boolean) => {
      on.set(next)
      void ctx.wire.call(guessesSet, { on: next }).catch(error => {
        on.set(!next)
        ctx.report(error)
      })
    }

    const row = () => {
      const { settingsRow, settingsSection, toggleSwitch } = ctx.kit
      return settingsSection(
        {},
        settingsRow(
          { title: 'Guess my next message', detail: 'After each reply, offer a likely next message in the empty box. Tab uses it. Each guess is a short extra call on the chat’s own model.' },
          toggleSwitch({ on, 'aria-label': 'Guess my next message', onClick: () => choose(!on.get()) }),
        ),
      )
    }

    ctx.on(wireHello, () => {
      on.set(helloOn())
      guesses.reset()
    })
    ctx.effect(() => ctx.wire.on(guessesChange, next => on.set(next.on)))
    ctx.effect(guesses.listen)
    ctx.effect(() => ctx.composer.suggest(chat => (on.get() ? guesses.of(chat) : undefined)))
    ctx.watch(settings, found => found?.section({ page: 'features', id: 'guesses', order: 30, render: row }))
  },
})
