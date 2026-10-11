import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { errorLines, pageLine } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({ action: z.enum(['back', 'forward', 'reload']) })

export const navigateTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_navigate',
  description: 'Go back, go forward or reload the page.',
  input,
  run: ({ action }, { session }) =>
    tabs.current(session, async tab => {
      const since = Date.now()
      return `${pageLine(await tab.agent.history(action))}${errorLines(tab.agent.errorsSince(since))}`
    }),
})
