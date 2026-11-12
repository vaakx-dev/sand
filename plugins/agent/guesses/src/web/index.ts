import { composer } from '@sand/composer/contract'
import { wire, wireHello } from '@sand/devices-contract'
import { definePlugin } from 'drydock'
import { createGuesses } from './guesses'

export default definePlugin({
  name: 'guesses-web',
  description: 'Offers the guessed next message in the empty composer',
  inject: { wire, composer },
  apply(ctx) {
    const guesses = createGuesses(ctx.wire)
    ctx.on(wireHello, () => guesses.reset())
    ctx.effect(guesses.listen)
    ctx.effect(() => ctx.composer.suggest(guesses.of))
  },
})
