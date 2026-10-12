import { attempt, owned, shownPanel } from '@sand/kit/web'
import type { UserContent } from '@sand/messages'
import { sig } from '@vaakx-dev/vrui'
import { definePlugin } from 'drydock'
import { browserPanel } from './panel'
import { tabModel } from './tab/model'

export default definePlugin({
  name: 'browser-panel',
  description: 'Browser panel: a live headless Chrome tab you and the agent share, with input, pick, screenshot and console',
  inject: ['threads', 'wire', 'kit'],
  uses: {
    panels: 'draws its own plain panel and cannot open itself when the agent starts browsing',
    composer: 'screenshots and picked elements cannot be attached',
    notify: 'failed browser actions are not reported',
  },
  apply(ctx) {
    const visible = sig(false)
    const tab = owned(ctx, () => tabModel(ctx, () => ctx.panels?.show('browser')))

    const attach = (content: UserContent[]) => {
      if (ctx.composer) ctx.composer.attach(content)
      else ctx.notify?.push('No composer is loaded to attach to', { level: 'error' })
    }

    const control = shownPanel(
      ctx,
      { id: 'browser', title: 'Browser', icon: 'globe', order: 5 },
      () =>
        browserPanel(ctx.kit, {
          tab,
          visible,
          attach,
          tell: text => ctx.notify?.push(text, { level: 'info' }),
          guard: (failed, work) => void attempt(ctx.notify, failed, work),
        }),
      () => visible.set(control.shown()),
    )
  },
})
