import type { Picker } from './contract'
import { owned } from '@sand/kit/web'
import { media } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { choose } from './choose/view'
import { ask } from './input'

export default definePlugin({
  name: 'picker',
  description: 'Pick and input sheets for server and local prompts: fuzzy, "phrase" and re: search, tree prefixes, extra keys as buttons',
  inject: ['kit'],
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

    const picker: Picker = {
      choose: (title, items, options) => turn(() => choose(ctx.kit, cancels, fine, title, items, options)),
      input: (title, value) => turn(() => ask(ctx.kit, cancels, title, value)),
    }

    ctx.effect(() => () => {
      closed = true
      for (const cancel of [...cancels]) cancel()
    })
    ctx.provide('picker', picker)
  },
})
