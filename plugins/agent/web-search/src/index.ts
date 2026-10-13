import { definePlugin } from 'drydock'
import { webAgent } from './agent'
import { fetchTool } from './fetch/tool'
import { searchBrowser } from './search/browser'
import { searchTool } from './search/tool'

const group = 'web'

export default definePlugin({
  name: 'web-search',
  description: 'web_search (DuckDuckGo in a headless browser) and web_fetch tools in an on-demand tool group, and a web sub-agent on the worker model that uses them',
  inject: ['tools'],
  uses: { agents: 'there is no web sub-agent; the main agent finds the web tools itself' },
  apply(ctx) {
    const browser = searchBrowser()
    ctx.effect(() => () => void browser.close())
    const tools = [searchTool(browser), fetchTool()]
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Web', summary: 'search the web and read pages as markdown', load: 'on-demand' }))
    for (const tool of tools) ctx.effect(() => ctx.tools.register({ ...tool, group }))
    ctx.watch('agents', agents => agents?.define(webAgent(tools.map(tool => tool.name))))
  },
})
