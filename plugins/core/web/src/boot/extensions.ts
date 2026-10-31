import type { Context, Scope } from 'drydock'
import type { BundledExtension } from 'sand:extensions'
import { pluginsOffMeta } from '../contract'
import { reportStates } from './report'

const pluginsOff = () => new Set(document.querySelector<HTMLMetaElement>(`meta[name="${pluginsOffMeta}"]`)?.content.split(' ') ?? [])

export const mountExtensions = (ctx: Context, bundled: BundledExtension[]) => {
  const off = pluginsOff()
  const mounted = new Map<string, Scope>()
  const builtinsFirst = [...bundled.filter(extension => extension.builtin), ...bundled.filter(extension => !extension.builtin)]
  for (const { id, plugin } of builtinsFirst) if (plugin && !off.has(id)) mounted.set(id, ctx.plugin(plugin))
  reportStates(ctx, bundled, mounted)
}
