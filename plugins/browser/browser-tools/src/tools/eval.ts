import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import type { Tabs } from '../tabs'

const input = z.object({ script: z.string().max(20_000).describe('Async function body run in the page; return a JSON value') })

export const evalTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_eval',
  description: 'Run JavaScript in the page and get the returned value.',
  input,
  run: ({ script }, { session }) => tabs.current(session, tab => tab.agent.evaluate(script)),
})
