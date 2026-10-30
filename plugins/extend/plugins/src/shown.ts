import { wireHello } from '@sand/devices-contract'
import { settings, settingsChange } from '@sand/settings/contract'
import type { WireContext } from './context'

export const page = 'plugins'

export const whenShown = (ctx: WireContext, load: () => void) => {
  const shown = () => ctx.get(settings)?.current() === page
  const refresh = () => {
    if (shown() && ctx.wire.ready()) load()
  }
  ctx.on(settingsChange, refresh)
  ctx.on(wireHello, refresh)
  refresh()
  return refresh
}
