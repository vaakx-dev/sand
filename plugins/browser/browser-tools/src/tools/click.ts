import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { afterAction } from '../report'
import type { Tabs } from '../tabs'

const input = z
  .object({
    ref: z.string().optional().describe('Element ref from browser_snapshot, e.g. e12'),
    x: z.number().optional().describe('Page x in CSS pixels, only when there is no ref'),
    y: z.number().optional(),
    double: z.boolean().optional(),
  })
  .refine(target => target.ref || (target.x !== undefined && target.y !== undefined), 'Give a ref, or both x and y')

const targetOf = ({ ref, x = 0, y = 0 }: { ref?: string; x?: number; y?: number }) => (ref ? { ref } : { x, y })

export const clickTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_click',
  description: 'Click an element by ref, or a point.',
  input,
  run: (target, { session }) =>
    tabs.current(session, async tab => {
      const since = Date.now()
      const label = await tab.agent.click(targetOf(target), target.double ? 2 : 1)
      return afterAction(tab, since, `Clicked ${label}.`)
    }),
})
