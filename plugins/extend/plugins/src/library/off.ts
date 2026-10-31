import { webPluginsOff } from '@sand/web/contract'
import { sig } from '@vaakx-dev/vrui'
import type { WireContext } from '../context'
import { whenShown } from '../shown'

const folderName = (dir: string) => dir.split(/[\\/]/).pop() ?? dir

export const offSource = (ctx: WireContext) => {
  const off = sig(new Map<string, string[]>())

  const load = () => {
    ctx.wire.call(webPluginsOff, {}).then(
      plugins => off.set(new Map(plugins.map(plugin => [folderName(plugin.dir), plugin.needs]))),
      () => off.set(new Map()),
    )
  }

  whenShown(ctx, load)

  return { needs: (name: string) => off.get().get(name) }
}
