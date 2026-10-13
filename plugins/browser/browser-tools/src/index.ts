import type { Tool } from '@sand/tools/contract'
import { definePlugin } from 'drydock'
import { browserAgent } from './agent'
import { createTabs, type Tabs } from './tabs'
import { clickTool } from './tools/click'
import { consoleTool } from './tools/console'
import { evalTool } from './tools/eval'
import { navigateTool } from './tools/navigate'
import { openTool } from './tools/open'
import { pressTool } from './tools/press'
import { screenshotTool } from './tools/screenshot'
import { scrollTool } from './tools/scroll'
import { snapshotTool } from './tools/snapshot'
import { typeTool } from './tools/type'
import { waitTool } from './tools/wait'

const group = 'browser'

const browserTools = (tabs: Tabs): Tool[] => [
  openTool(tabs),
  navigateTool(tabs),
  snapshotTool(tabs),
  clickTool(tabs),
  typeTool(tabs),
  pressTool(tabs),
  scrollTool(tabs),
  waitTool(tabs),
  screenshotTool(tabs),
  consoleTool(tabs),
  evalTool(tabs),
]

export default definePlugin({
  name: 'browser-tools',
  description: 'browser_* tools in an on-demand tool group, and a browser sub-agent on the worker model that uses them',
  inject: ['tools', 'browser', 'sessions'],
  uses: { agents: 'there is no browser sub-agent; the main agent finds the browser tools itself' },
  apply(ctx) {
    const tools = browserTools(createTabs(ctx.browser, ctx.sessions))
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Browser', summary: 'open, read and click pages in the in-app browser the user watches', load: 'on-demand' }))
    for (const tool of tools) ctx.effect(() => ctx.tools.register({ ...tool, group }))
    ctx.watch('agents', agents => agents?.define(browserAgent(tools.map(tool => tool.name))))
  },
})
