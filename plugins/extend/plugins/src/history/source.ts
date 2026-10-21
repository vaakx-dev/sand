import { type Version, type VersionTarget, versionsChange, versionsList, versionsRestore } from '@sand/host-plugin-versions/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { PluginsContext } from '../context'
import { whenShown } from '../shown'

export const versionsSource = (ctx: PluginsContext) => {
  const targets = sig<VersionTarget[]>([])
  const busy = sig<string | undefined>(undefined)

  const load = () => {
    ctx.wire.call(versionsList, {}).then(
      next => targets.set(next),
      () => targets.set([]),
    )
  }

  const target = (key: string) => derive(() => targets.get().find(item => item.key === key))

  const restore = async (target: VersionTarget, version: Version) => {
    busy.set(target.key)
    await ctx.wire.call(versionsRestore, { target: target.key, version: version.id }).then(
      next => targets.set(targets.get().map(item => (item.key === next.key ? next : item))),
      () => {},
    )
    busy.set(undefined)
  }

  whenShown(ctx, load)
  ctx.effect(() => ctx.wire.on(versionsChange, next => targets.set(next)))

  const copy = (text: string) => () => ctx.kit.copyText(text)

  return { targets, busy, target, restore, copy }
}

export type VersionsSource = ReturnType<typeof versionsSource>
