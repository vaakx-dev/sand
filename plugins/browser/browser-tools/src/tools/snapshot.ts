import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { pageLine } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({})

export const snapshotTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_snapshot',
  description: 'Read the page as an accessibility tree. Elements you can act on have refs like [ref=e12].',
  input,
  run: (_, { session }) => tabs.current(session, async tab => `${pageLine(tab.state())}\n\n${await tab.agent.snapshot()}`),
})
