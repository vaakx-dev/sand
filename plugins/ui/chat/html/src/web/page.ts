import { imageViewer } from '@sand/images/contract'
import { keys } from '@sand/keys/contract'
import { theme, type Theme } from '@sand/ui-theme/contract'
import { joinDisposers } from '@sand/util'
import type { FrameContext } from './context'
import { listenToFrame, sendKeys, sendTheme, showPageIn, type FrameEvents } from './integrations/frame'
import { themeCss } from './theme'

export const connectPage = (ctx: FrameContext, frame: HTMLIFrameElement, events: Pick<FrameEvents, 'resize' | 'swipe'>) => {
  const paint = (current: Theme | undefined) => {
    if (current) sendTheme(frame, themeCss(current))
  }
  return {
    show(html: string) {
      showPageIn(frame, html)
      paint(ctx.get(theme))
      sendKeys(frame, ctx.get(keys)?.passthroughKeys() ?? [])
    },
    listen: () =>
      joinDisposers(
        listenToFrame(frame, {
          ...events,
          open: ctx.kit.openTab,
          image: (src, name) => ctx.get(imageViewer)?.show(src, name),
          key: key => ctx.get(keys)?.runPassthrough(key),
        }),
        ctx.watch(theme, paint),
      ),
  }
}
