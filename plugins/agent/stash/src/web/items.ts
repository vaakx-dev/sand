import type { Stashed } from '../contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const createItems = (ctx: Context<'wire'>) => {
  const list = sig<Stashed[]>([])
  const seen = sig<Set<string> | undefined>(undefined)

  const load = () =>
    ctx.wire.call<Stashed[]>({ type: 'stash.list' }).then(
      items => {
        list.set(items)
        if (!seen.get()) seen.set(new Set(items.map(item => item.id)))
      },
      () => {},
    )

  ctx.on('wire.hello', () => void load())
  ctx.on('wire.event', event => {
    if (event.name === 'stash.change') void load()
  })
  if (ctx.wire.state() === 'open') void load()

  return {
    list,
    load,
    fresh: derive(() => list.get().some(item => !seen.get()?.has(item.id))),
    see: () => seen.set(new Set(list.get().map(item => item.id))),
    drop: (id: string) => list.update(items => items.filter(item => item.id !== id)),
  }
}

export type Items = ReturnType<typeof createItems>
