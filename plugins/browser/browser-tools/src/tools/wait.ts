import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { pageLine } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({
  text: z.string().optional().describe('Wait until this text shows'),
  gone: z.string().optional().describe('Wait until this text is gone'),
  timeout_ms: z.number().int().min(100).max(30_000).default(10_000),
})

export const waitTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_wait',
  description: 'Wait for text to show or go away, or for a fixed time.',
  input,
  run: ({ text, gone, timeout_ms }, { session }) =>
    tabs.current(session, async tab => {
      const met = await tab.agent.wait({ text, gone, ms: timeout_ms })
      return `${met ? 'Done waiting.' : `Still waiting after ${timeout_ms} ms.`}\n${pageLine(tab.state())}`
    }),
})
