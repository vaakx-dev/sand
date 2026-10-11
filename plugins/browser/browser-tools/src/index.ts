import type { Agents } from '@sand/agents/contract'
import type { Tool } from '@sand/tools/contract'
import { definePlugin, type Context } from 'drydock'
import { z } from 'zod'
import { browserAgent, type AgentChoice } from './agent'
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

const defineAgent = (ctx: Context, agents: Agents, names: string[], choice: AgentChoice) => {
  let undefine = agents.define(browserAgent(names, ctx.llm, choice))
  const off = ctx.on('llm.models', () => {
    void undefine()
    undefine = agents.define(browserAgent(names, ctx.llm, choice))
  })
  return () => {
    void off()
    void undefine()
  }
}

export default definePlugin({
  name: 'browser-tools',
  description: 'browser_* tools in an on-demand tool group, and a browser sub-agent that uses them on a small model',
  inject: ['tools', 'browser', 'sessions'],
  uses: { agents: 'there is no browser sub-agent; the main agent finds the browser tools itself' },
  config: z.object({
    model: z.string().default('haiku'),
    effort: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('low'),
  }),
  apply(ctx, config) {
    const tools = browserTools(createTabs(ctx.browser, ctx.sessions))
    ctx.effect(() => ctx.tools.group({ name: group, label: 'Browser', summary: 'open, read and click pages in the in-app browser the user watches', load: 'on-demand' }))
    for (const tool of tools) ctx.effect(() => ctx.tools.register({ ...tool, group }))
    ctx.watch('agents', agents => (agents ? defineAgent(ctx, agents, tools.map(tool => tool.name), config) : undefined))
  },
})
