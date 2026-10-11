import { addressOf } from '@sand/browser-engine/address'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { errorLines, pageLine } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({
  url: z.string().describe('A URL, a localhost port like 5173, or a file path relative to the project'),
})

export const openTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_open',
  description: "Open a page in the thread's browser tab, which the user sees live. Waits for it to load.",
  input,
  run({ url }, { session, cwd }) {
    const address = addressOf(url, cwd)
    return tabs.open(session, async tab => {
      const since = Date.now()
      const opened = await tab.agent.open(address)
      return `${pageLine(opened)}${errorLines(tab.agent.errorsSince(since))}`
    })
  },
})
