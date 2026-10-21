import { layout } from '@sand/layout/contract'
import { kit } from '@sand/ui-kit/contract'
import { collectScope, disposeAll } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { swipeGesture } from './integrations/touch'

export default definePlugin({
  name: 'gesture',
  description: 'Drag across the screen on a phone to open or close the sidebar and the right panel',
  inject: { kit },
  apply(ctx) {
    ctx.watch(layout, found => {
      if (!found) return
      const { scope } = collectScope(() => swipeGesture(ctx.kit, () => found.swipe()))
      return () => disposeAll(scope)
    })
  },
})
