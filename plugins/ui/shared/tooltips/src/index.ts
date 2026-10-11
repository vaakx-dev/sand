import { owned, portal, registerInScope } from '@sand/dom'
import { definePlugin } from 'drydock'
import { bubble } from './bubble'
import { followEvents } from './events'
import { restoreTitles, watchTitles } from './integrations/titles'
import { tooltipModel } from './model'

export default definePlugin({
  name: 'tooltips',
  description: "Shows sand's own tooltip for every title, on hover or keyboard focus, and keeps the browser's tooltip from showing",
  apply(ctx) {
    owned(ctx, () => {
      const model = tooltipModel()
      watchTitles(model.changed)
      followEvents(model)
      portal(document.body, bubble(model.tip))
      registerInScope(() => {
        model.stop()
        restoreTitles()
      })
    })
  },
})
