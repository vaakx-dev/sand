import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { afterAction } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({
  direction: z.enum(['up', 'down', 'left', 'right']).default('down'),
  pages: z.number().min(0.1).max(10).default(1),
  ref: z.string().optional().describe('Scroll the area under this element instead of the page'),
})

export const scrollTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_scroll',
  description: 'Scroll the page or an area of it.',
  input,
  run: ({ direction, pages, ref }, { session }) =>
    tabs.current(session, async tab => {
      const since = Date.now()
      await tab.agent.scroll(direction, pages, ref)
      return afterAction(tab, since, `Scrolled ${direction}.`)
    }),
})
