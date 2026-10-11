import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { afterAction } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({ keys: z.string().describe('A key or chord, e.g. Enter, Escape, ArrowDown, Control+a') })

export const pressTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_press',
  description: 'Press a key in the focused element.',
  input,
  run: ({ keys }, { session }) =>
    tabs.current(session, async tab => {
      const since = Date.now()
      await tab.agent.press(keys)
      return afterAction(tab, since, `Pressed ${keys}.`)
    }),
})
