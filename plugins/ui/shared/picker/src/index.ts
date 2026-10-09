import type { Picker } from './contract'
import { finePointer, owned } from '@sand/dom'
import { definePlugin } from 'drydock'
import { choose } from './choose/view'
import { ask } from './input'

export default definePlugin({
  name: 'picker',
  description: 'Pick and input sheets for server and local prompts: fuzzy, "phrase" and re: search, tree prefixes, extra keys as buttons',
  apply(ctx) {
    let queue: Promise<unknown> = Promise.resolve()
    const cancels = new Set<() => void>()
    const fine = owned(ctx, finePointer)
    let closed = false

    const turn = <T>(show: () => Promise<T | undefined>) => {
      const next = queue.then(() => (closed ? undefined : show()))
      queue = next.catch(() => {})
      return next
    }

    const picker: Picker = {
      choose: (title, items, options) => turn(() => choose(cancels, fine, title, items, options)),
      input: (title, value) => turn(() => ask(cancels, title, value)),
    }

    ctx.effect(() => () => {
      closed = true
      for (const cancel of [...cancels]) cancel()
    })
    ctx.provide('picker', picker)
  },
})
