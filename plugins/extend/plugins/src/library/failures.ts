import { hostHealthRequest } from '@sand/host-health/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WireContext } from '../context'
import { whenShown } from '../shown'

export const failuresSource = (ctx: WireContext) => {
  const failures = sig(new Map<string, string>())

  const load = () => {
    ctx.wire.call(hostHealthRequest, {}).then(
      health => failures.set(new Map(health.failedPlugins.map(plugin => [plugin.id, plugin.error]))),
      () => failures.set(new Map()),
    )
  }

  whenShown(ctx, load)

  return { failure: (name: string) => failures.get().get(name) }
}
