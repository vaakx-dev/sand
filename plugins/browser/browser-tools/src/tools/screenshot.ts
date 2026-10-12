import type { UserContent } from '@sand/messages'
import type { Tool } from '@sand/tools/contract'
import { resolve } from 'node:path'
import { z } from 'zod'
import { pageLine } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({
  ref: z.string().optional().describe('Only this element'),
  path: z.string().optional().describe('Also save the JPEG to this file, absolute or relative to the working directory'),
})

export const screenshotTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_screenshot',
  description: 'See the page as an image, and optionally save it. Use it when the layout or visuals matter; browser_snapshot is cheaper for reading.',
  input,
  run: ({ ref, path }, { session, cwd }) =>
    tabs.current(session, async (tab): Promise<UserContent[]> => {
      const data = await tab.agent.screenshot(ref)
      const { width, height } = tab.state().viewport
      const lines = [pageLine(tab.state()), `Viewport ${width}×${height}.`]
      if (path) {
        await Bun.write(resolve(cwd, path), Buffer.from(data, 'base64'))
        lines.push(`Saved to ${path}.`)
      }
      return [
        { type: 'text', text: lines.join('\n') },
        { type: 'image', mediaType: 'image/jpeg', data, name: 'browser.jpg' },
      ]
    }),
})
