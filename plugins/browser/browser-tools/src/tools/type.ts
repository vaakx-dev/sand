import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { afterAction } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({
  ref: z.string().describe('Ref of the field from browser_snapshot'),
  text: z.string(),
  submit: z.boolean().optional().describe('Press Enter afterwards'),
  append: z.boolean().optional().describe('Keep the text already in the field'),
})

export const typeTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_type',
  description: 'Type text into a field, replacing what is there.',
  input,
  run: ({ ref, text, submit = false, append = false }, { session }) =>
    tabs.current(session, async tab => {
      const since = Date.now()
      const label = await tab.agent.type(ref, text, { clear: !append, submit })
      return afterAction(tab, since, `Typed into ${label}${submit ? ' and pressed Enter' : ''}.`)
    }),
})
