import { place } from '@sand/layout/place'
import { derive, div, effect, span, stored, untrack } from '@vaakx-dev/vrui'
import type { Dispose } from 'drydock'
import { overlaySlot } from '../shared/overlay'
import type { Ui } from '../ui'
import { anywhereSheet } from './sheet'

const recent = 10 * 60_000

const homeWifiPage = () => location.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)

const banner = (ui: Ui, tone: 'accent' | 'neutral', mark: HTMLElement, title: string, text: string, dismiss: () => void, action?: HTMLElement) => {
  const { closeButton, statusBanner } = ui.kit
  return div(
    { class: 'px-3 pt-2' },
    statusBanner(
      { tone },
      mark,
      div({ class: 'flex min-w-0 flex-1 flex-col' }, span({ class: 'text-sm' }, title), span({ class: 'text-xs text-neutral-400' }, text)),
      action ?? null,
      closeButton({ title: 'Dismiss', size: 'sm', surface: 'raised', onClick: dismiss }),
    ),
  )
}

export const anywherePrompt = (ui: Ui) => {
  const { icon, primaryAction } = ui.kit
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
    banner(
      ui,
      'accent',
      span({ class: 'inline-flex text-accent-400' }, icon('globe', 'md')),
      'Use this phone from anywhere',
      'Right now it only works on your home wifi.',
      () => dismissed.set(true),
      primaryAction({ size: 'sm', onClick: open }, 'Set up'),
    )
  const doneView = () =>
    banner(
      ui,
      'neutral',
      span({ class: 'inline-flex text-success-400' }, icon('check', 'md')),
      'This phone works anywhere now',
      'Add this page to your home screen and open sand from there.',
      () => doneSeen.set(true),
    )

  let unplace: Dispose | undefined
  effect(() => {
    const view = offer.get() ? offerView : arrived.get() ? doneView : undefined
    untrack(() => {
      void unplace?.()
      unplace = view ? place(ui.ctx, 'top', view, 5) : undefined
    })
  })
}
