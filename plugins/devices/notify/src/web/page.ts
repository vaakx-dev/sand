import type { Wire } from '@sand/devices-contract'
import { settingMark } from '@sand/settings/contract'
import type { Toasts } from '@sand/toasts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, type Sig, sig } from '@vaakx-dev/vrui'
import { type MomentKind, momentKinds, moments, notifyMoment } from '../contract'
import type { PushChannel, Support } from './channel'

export interface PageDeps {
  kit: Kit
  wire: Wire
  toasts: Toasts
  on: Sig<boolean>
  key: Sig<string | undefined>
  off: Sig<MomentKind[]>
  channel: PushChannel
  device(): string
}

const toastId = 'notify'

const unavailable: Record<Exclude<Support, 'ready'>, string> = {
  insecure: 'Needs HTTPS, such as Tailscale HTTPS',
  install: 'Add sand to your Home Screen first',
  missing: 'This browser can’t show notifications',
}

const blockedText = 'Blocked. Allow them in site settings'

export const notifyItems = [
  { id: 'notify-device', label: 'Notify this device', keywords: ['notifications', 'push', 'alerts', 'phone', 'enable'] },
  { id: 'notify-moments', label: 'Notify about', keywords: ['notifications', 'needs you', 'finished', 'failed', 'routine', 'paused'] },
]

export const notificationsPage = ({ kit, wire, toasts, on, key, off, channel, device }: PageDeps): HTMLElement => {
  const { settingsRow, settingsSection, toggleSwitch } = kit
  const supported = channel.support()
  const blocked = sig(channel.blocked())
  const busy = sig(false)

  const toggle = async () => {
    const pushKey = key.get()
    if (!pushKey) return
    busy.set(true)
    const turningOn = !on.get()
    await toasts.attempt(turningOn ? 'Couldn’t turn notifications on' : 'Couldn’t turn notifications off', () => (turningOn ? channel.subscribe(pushKey) : channel.unsubscribe()), { id: toastId })
    blocked.set(channel.blocked())
    busy.set(false)
  }

  const problem = derive(() => {
    if (supported !== 'ready') return unavailable[supported]
    return blocked.get() ? blockedText : null
  })
  const disabled = derive(() => supported !== 'ready' || !key.get() || busy.get() || (blocked.get() && !on.get()))

  const setMoment = (kind: MomentKind, wanted: boolean) => toasts.attempt('Couldn’t change notifications', () => wire.call(notifyMoment, { kind, on: wanted }), { id: toastId })

  const momentRow = (kind: MomentKind) => {
    const { label } = moments[kind]
    const wanted = derive(() => !off.get().includes(kind))
    return settingsRow({ title: label }, toggleSwitch({ on: wanted, 'aria-label': `Notify about ${label}`, onClick: () => void setMoment(kind, !wanted.get()) }))
  }

  const momentsReset = { changed: () => off.get().length > 0, run: () => off.get().forEach(kind => void setMoment(kind, true)) }

  return div(
    { class: 'flex flex-col gap-6' },
    settingsSection(
      { title: device },
      settingsRow(
        { title: 'Notify this device', detail: problem, ...settingMark('notify-device') },
        toggleSwitch({ on, 'aria-label': 'Notify this device', disabled, onClick: () => void toggle() }),
      ),
    ),
    settingsSection({ title: 'Notify every device about', reset: momentsReset, ...settingMark('notify-moments') }, ...momentKinds.map(momentRow)),
  )
}
