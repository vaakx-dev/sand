import type { Version, VersionTarget } from '@sand/host-plugin-versions/contract'
import { derive, errorMessage, exactTime, sig } from '@sand/dom'
import type { Context } from 'drydock'
import { copyWithNotice } from '../copy'
import { whenShown } from '../shown'

export const versionsSource = (ctx: Context<'wire'>) => {
  const targets = sig<VersionTarget[]>([])
  const busy = sig<string | undefined>(undefined)

  const load = () => {
    ctx.wire.call<VersionTarget[]>({ type: 'versions.list' }).then(
      next => targets.set(next),
      () => targets.set([]),
    )
  }

  const target = (key: string) => derive(() => targets.get().find(item => item.key === key))

  const restore = async (target: VersionTarget, version: Version) => {
    busy.set(target.key)
    try {
      const next = await ctx.wire.call<VersionTarget>({ type: 'versions.restore', target: target.key, version: version.id })
      targets.set(targets.get().map(item => (item.key === next.key ? next : item)))
      ctx.notify?.push(`${target.name} is back to the version from ${exactTime(version.at)}. A fresh runtime is starting.`)
    } catch (error) {
      ctx.notify?.push(errorMessage(error), { level: 'error' })
    } finally {
      busy.set(undefined)
    }
  }

  whenShown(ctx, load)
  ctx.on('wire.event', event => {
    if (event.name === 'versions.change') targets.set(event.args[0])
  })

  const copy = (text: string, what: string) => copyWithNotice(ctx, text, what)

  return { targets, busy, target, restore, copy }
}

export type VersionsSource = ReturnType<typeof versionsSource>
