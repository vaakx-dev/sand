import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { fetchTool } from './fetch/tool'
import { searchTool } from './search/tool'

const group = 'web'

export default definePlugin({
  name: 'web',
  description: 'web_search (DuckDuckGo) and web_fetch (pages as markdown) tools',
  inject: { tools },
  apply(ctx) {
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Web', summary: 'search the web and read pages as markdown', load: 'always' }))
    for (const tool of [searchTool, fetchTool()]) ctx.effect(() => ctx.tools.register({ ...tool, group }))
  },
})
