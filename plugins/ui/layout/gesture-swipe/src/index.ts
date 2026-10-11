import { collectScope, disposeAll } from '@sand/dom'
import { definePlugin } from 'drydock'
import { frameSwipes } from './integrations/frames'
import { swipeGesture } from './integrations/touch'

export default definePlugin({
  name: 'gesture-swipe',
  description: 'Drag across the screen on a phone to open or close the sidebar and the right panel',
  uses: { layout: 'no swiping; the buttons still open the drawers' },
  apply(ctx) {
    ctx.watch('layout', layout => {
      if (!layout) return
      const begin = () => layout.swipe()
      const { scope } = collectScope(() => {
        swipeGesture(begin)
        frameSwipes(begin)
      })
      return () => disposeAll(scope)
    })
  },
})
