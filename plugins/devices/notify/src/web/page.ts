import type { Wire } from '@sand/devices-contract'
import type { Toasts } from '@sand/toasts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, type Sig, sig } from '@vaakx-dev/vrui'
import { notifySubscribe, notifyUnsubscribe } from '../contract'
import { permission, type Support, subscribe, support, unsubscribe } from './browser'

export interface PageDeps {
  kit: Kit
  wire: Wire
  toasts: Toasts
  on: Sig<boolean>
  key: Sig<string | undefined>
  device(): string
}

const toastId = 'notify'

const unavailable: Record<Exclude<Support, 'ready'>, string> = {
  insecure: 'Needs a secure address. Open sand over HTTPS, such as Tailscale HTTPS from the Devices page.',
  install: 'On iPhone and iPad, add sand to your Home Screen with Share, then Add to Home Screen, and turn this on there.',
  missing: 'This browser can’t show notifications.',
}

const blocked = 'Blocked for this site. Allow notifications in the browser’s site settings, then turn this on.'
const ready = 'For threads on any of your PCs, even when sand is closed.'

export const notificationsPage = ({ kit, wire, toasts, on, key, device }: PageDeps): HTMLElement => {
  const { settingsRow, settingsSection, toggleSwitch } = kit
  const supported = support()
  const allowed = sig(permission())
  const busy = sig(false)

  const enable = async (pushKey: string) => {
    const target = await subscribe(pushKey)
    if (target) await wire.call(notifySubscribe, target)
  }

  const disable = async () => {
    await unsubscribe()
    await wire.call(notifyUnsubscribe, {})
  }

  const toggle = async () => {
    const pushKey = key.get()
    if (!pushKey) return
    busy.set(true)
    const turningOn = !on.get()
    await toasts.attempt(toastId, turningOn ? 'Couldn’t turn notifications on' : 'Couldn’t turn notifications off', () => (turningOn ? enable(pushKey) : disable()))
    allowed.set(permission())
    busy.set(false)
  }

  const detail = derive(() => {
    if (supported !== 'ready') return unavailable[supported]
    return allowed.get() === 'denied' ? blocked : ready
  })
  const disabled = derive(() => supported !== 'ready' || !key.get() || busy.get() || (allowed.get() === 'denied' && !on.get()))

  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection(
      { title: device },
      settingsRow(
        { title: 'When a turn finishes or fails', detail },
        toggleSwitch({ on, 'aria-label': 'Notify this device when a turn finishes or fails', disabled, onClick: () => void toggle() }),
      ),
    ),
  )
}
