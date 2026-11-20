import { paths } from '@sand/paths/contract'
import { server } from '@sand/server/contract'
import { stepTools } from '@sand/turns-contract/contract'
import { definePlugin } from 'drydock'
import { createCatalog } from './catalog/catalog'
import { loadChoices } from './catalog/choices'
import { tools as toolsService, toolsChange } from './contract'
import { serveTools } from './serve'

const FOLD_LAST = -100

export default definePlugin({
  name: 'tools',
  description: 'Tool registry and catalog: always-loaded tools, and tool groups the agent loads on demand with find_tools',
  inject: { paths },
  async apply(ctx) {
    const tools = createCatalog(await loadChoices(ctx.paths.home), () => ctx.emit(toolsChange))
    ctx.provide(toolsService, tools)
    ctx.on(stepTools, specs => tools.fold(specs), { priority: FOLD_LAST })
    ctx.watch(server, found => (found ? serveTools(ctx, found, tools) : undefined))
  },
})
