import { sandConfig } from '@sand/config/contract'
import { tools } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { z } from 'zod'
import { fetchTool } from './fetch/tool'
import { searchTool } from './search/tool'

const group = 'web'

const schema = z.object({
  exa_api_key: z.string().optional(),
})

export default definePlugin({
  name: 'web',
  description: 'web_search (Exa, then DuckDuckGo) and web_fetch (pages as markdown) tools',
  inject: { tools, sandConfig },
  apply(ctx) {
    const { exa_api_key } = schema.parse(ctx.sandConfig.section('web') ?? {})
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Web', summary: 'search the web and read pages as markdown', load: 'always' }))
    for (const tool of [searchTool(exa_api_key), fetchTool()]) ctx.effect(() => ctx.tools.register({ ...tool, group }))
  },
})
