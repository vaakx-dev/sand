import { pluginStates } from '@sand/config/contract'
import { type WebExtensionState, webExtensions } from '@sand/web/contract'
import type { Context } from 'drydock'
import type { PluginRow } from '../contract'

const webOnlyRow = (web: WebExtensionState): PluginRow => ({
  name: web.id,
  folder: web.dir,
  status: web.needs ? 'off' : (web.browser?.status ?? 'pending'),
  needs: web.needs,
  web,
})

const report = (ctx: Context): PluginRow[] => {
  const web = ctx.get(webExtensions)?.list() ?? []
  const byFolder = new Map(web.map(state => [state.dir, state]))
  const plugins: PluginRow[] = pluginStates(ctx).map(state => {
    const found = state.folder === undefined ? undefined : byFolder.get(state.folder)
    return found ? { ...state, web: found } : state
  })
  const owned = new Set(plugins.map(plugin => plugin.web))
  return [...plugins, ...web.filter(state => !owned.has(state)).map(webOnlyRow)]
}

export { report }
