import { botRoster } from '@sand/bots/contract'
import { androidApp } from '@sand/devices-contract'
import { pulse } from '@sand/reactive'
import { toastsOf } from '@sand/toasts/contract'
import { sheetSlot } from '@sand/ui-shell/contract'
import type { Shared } from '@sand/web/contract'
import { projectsChange, threadsChange } from '@sand/web-client/contract'
import { definePlugin } from 'drydock'
import { inject } from './context'
import { appShares } from './incoming/app'
import { browserShare } from './incoming/browser'
import { shareSheet } from './sheet/sheet'

export default definePlugin({
  name: 'share',
  description: 'Send to sand: a picture, file or link shared from another app or the browser opens a sheet that sends it to a new thread, a thread or a bot in one tap',
  inject,
  apply(ctx) {
    const sheet = sheetSlot(ctx)
    const changes = pulse(ctx, [threadsChange, projectsChange], [botRoster])
    const open = (shared: Shared) => sheet.open(() => shareSheet({ ctx, changes, shared }))
    const receive = (shared: Promise<Shared | undefined>) =>
      void shared.then(
        found => found && open(found),
        error => toastsOf(ctx).error('Couldn’t open what you shared', error),
      )
    receive(browserShare())
    ctx.watch(androidApp, app => app && appShares(app, receive))
  },
})
