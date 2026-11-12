import { shell, type Shell } from '@sand/ui-shell/contract'
import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/reactive'
import { media } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { choose } from './choose/view'
import { picker, type Picker } from './contract'
import { ask } from './input'

export default definePlugin({
  name: 'picker',
  description: 'Pick and input sheets for page prompts, with fuzzy search',
  inject: { kit },
  apply(ctx) {
    let queue: Promise<unknown> = Promise.resolve()
    const cancels = new Set<() => void>()
    const fine = owned(ctx, () => media('(pointer: fine)'))
    let closed = false

    const turn = <T>(open: (frame: Shell) => Promise<T | undefined>) => {
      const next = queue.then(() => {
        const frame = ctx.get(shell)
        return closed || !frame ? undefined : open(frame)
      })
      queue = next.catch(() => {})
      return next
    }

    const host: Picker = {
      choose: (title, items) => turn(frame => choose(ctx.kit, frame, cancels, fine, title, items)),
      input: (title, value) => turn(frame => ask(ctx.kit, frame, cancels, title, value)),
    }

    ctx.effect(() => () => {
      closed = true
      for (const cancel of [...cancels]) cancel()
    })
    ctx.provide(picker, host)
  },
})
