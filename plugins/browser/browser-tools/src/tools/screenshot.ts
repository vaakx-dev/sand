import type { UserContent } from '@sand/messages'
import type { Tool } from '@sand/tools/contract'
import { z } from 'zod'
import { pageLine } from '../report'
import type { Tabs } from '../tabs'

const input = z.object({ ref: z.string().optional().describe('Only this element') })

export const screenshotTool = (tabs: Tabs): Tool<typeof input> => ({
  name: 'browser_screenshot',
  description: 'See the page as an image. Use it when the layout or visuals matter; browser_snapshot is cheaper for reading.',
  input,
  run: ({ ref }, { session }) =>
    tabs.current(session, async (tab): Promise<UserContent[]> => {
      const data = await tab.agent.screenshot(ref)
      const { width, height } = tab.state().viewport
      return [
        { type: 'text', text: `${pageLine(tab.state())}\nViewport ${width}×${height}.` },
        { type: 'image', mediaType: 'image/jpeg', data, name: 'browser.jpg' },
      ]
    }),
})
