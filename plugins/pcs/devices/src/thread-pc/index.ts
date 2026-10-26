import { composer } from '@sand/composer/contract'
import { owned } from '@sand/web-client/reactive'
import { effect } from '@vaakx-dev/vrui'
import type { DevicesContext } from '../inject'
import { pcTab } from './tab'

export const threadPc = (ctx: DevicesContext) => {
  const tab = owned(ctx, () => pcTab(ctx))
  ctx.watch(composer, found => found && effect(() => (tab.visible.get() ? found.slot('tray-start', tab.view) : undefined)))
}
