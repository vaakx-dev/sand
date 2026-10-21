import type { Context, Scope } from 'drydock'
import type { BundledExtension } from 'sand:extensions'
import { reportStates } from './report'

export const mountExtensions = (ctx: Context, bundled: BundledExtension[]) => {
  const mounted = new Map<string, Scope>()
  const builtinsFirst = [...bundled.filter(extension => extension.builtin), ...bundled.filter(extension => !extension.builtin)]
  for (const { id, plugin } of builtinsFirst) if (plugin) mounted.set(id, ctx.plugin(plugin))
  reportStates(ctx, bundled, mounted)
}
