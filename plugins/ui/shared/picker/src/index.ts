import { kit } from '@sand/ui-kit/contract'
import { owned } from '@sand/web-client/reactive'
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

    const turn = <T>(open: () => Promise<T | undefined>) => {
      const next = queue.then(() => (closed ? undefined : open()))
      queue = next.catch(() => {})
      return next
    }

    const host: Picker = {
      choose: (title, items) => turn(() => choose(ctx.kit, cancels, fine, title, items)),
      input: (title, value) => turn(() => ask(ctx.kit, cancels, title, value)),
    }

    ctx.effect(() => () => {
      closed = true
      for (const cancel of [...cancels]) cancel()
    })
    ctx.provide(picker, host)
  },
})
