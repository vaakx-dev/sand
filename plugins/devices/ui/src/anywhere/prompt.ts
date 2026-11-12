import { place } from '@sand/ui-shell/contract'
import { derive, effect, stored, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import { overlaySlot } from '../shared/overlay'
import type { Ui } from '../ui'
import { anywhereSheet } from './sheet'

const recent = 10 * 60_000

const homeWifiPage = () => location.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)

export const anywherePrompt = (ui: Ui) => {
  const { banner, primaryAction } = ui.kit
  const dismissed = stored('sand.anywhere.dismissed', false)
  const doneSeen = stored(`sand.anywhere.done.${location.origin}`, false)
  const sheet = overlaySlot(ui.ctx, 120)
  const device = derive(() => {
    const state = ui.data.paired.get()
    return state.phase === 'paired' ? state.device : undefined
  })
  const offer = derive(() => {
    const serving = ui.data.home.tailscale.value.get()
    return device.get()?.kind === 'phone' && homeWifiPage() && Boolean(serving?.serving && serving.httpsUrl) && !dismissed.get()
  })
  const arrived = derive(() => {
    const keys = device.get()?.keys ?? []
    const here = keys.find(key => key.origin === location.origin)
    return location.protocol === 'https:' && keys.length > 1 && Boolean(here && Date.now() - here.added < recent) && !doneSeen.get()
  })

  const open = () => sheet.open(() => anywhereSheet(ui, sheet.close))
  const offerView = () =>
    banner({
      tone: 'accent',
      icon: 'globe',
      title: 'Use this phone from anywhere',
      detail: 'Right now it only works on your home wifi.',
      actions: [primaryAction({ size: 'sm', onClick: open }, 'Set up')],
      dismiss: () => dismissed.set(true),
    })
  const doneView = () =>
    banner({
      tone: 'success',
      title: 'This phone works anywhere now',
      detail: 'Add this page to your home screen and open sand from there.',
      dismiss: () => doneSeen.set(true),
    })

  let unplace: Dispose | undefined
  effect(() => {
    const view = offer.get() ? offerView : arrived.get() ? doneView : undefined
    untrack(() => {
      void unplace?.()
      unplace = view ? place(ui.ctx, 'top', view, 5) : undefined
    })
  })
}
