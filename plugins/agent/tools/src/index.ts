import type {} from '@sand/paths/contract'
import { definePlugin } from 'drydock'
import { createCatalog } from './catalog/catalog'
import { loadChoices } from './catalog/choices'
import { serveTools } from './serve'

export default definePlugin({
  name: 'tools',
  description: 'Tool registry and catalog: always-loaded tools, and tool groups the agent loads on demand with find_tools',
  inject: ['paths'],
  uses: { server: 'tool groups cannot be changed from the page' },
  async apply(ctx) {
    const tools = createCatalog(await loadChoices(ctx.paths.home), () => ctx.emit('tools.change'))
    ctx.provide('tools', tools)
    ctx.watch('server', server => (server ? serveTools(ctx, server, tools) : undefined))
  },
})
