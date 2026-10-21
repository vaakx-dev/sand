import type { TailscaleState } from '@sand/host-tailscale/contract'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { div, dynamicChild, show, sig, span } from '@vaakx-dev/vrui'
import { linkText } from '../components'
import type { DeviceSource } from '../source'

const status = ({ dot }: Kit, tone: Tone, label: string) => span({ class: 'flex min-w-0 items-center gap-2' }, dot(tone), span({ class: 'truncate' }, label))

const statusRow = (kit: Kit, state: TailscaleState) => {
  const { settingsRow } = kit
  if (!state.installed) return settingsRow(status(kit, 'neutral', 'Not installed'), null, 'Install Tailscale to reach sand away from home')
  if (!state.running) return settingsRow(status(kit, 'warning', 'Not connected'), null, 'Open Tailscale on this PC and sign in')
  return settingsRow(status(kit, 'success', state.name ? `Connected as ${state.name}` : 'Connected'), null, state.ip)
}

const servingRow = ({ copyButton }: Kit, url: string) =>
  div({ class: 'flex items-center gap-2 bg-neutral-900 px-4 py-2' }, linkText(url), copyButton({ text: () => url, label: 'Copy' }))

const helpText = (name?: string) =>
  `Runs tailscale serve so phones can open sand at ${name ? `https://${name}` : 'an https address'} and install it as an app. This changes this PC’s Tailscale serve settings.`

export const tailscaleSection = (kit: Kit, source: DeviceSource) => {
  const { errorRow, settingsRow, settingsSection, toggleSwitch } = kit
  const busy = sig(false)
  const state = source.tailscale
  const https = () => state.get()?.https ?? false
  const toggle = () => {
    busy.set(true)
    source
      .setHttps(!https())
      .catch(() => {})
      .finally(() => busy.set(false))
  }
  return show(state.map(Boolean), () =>
    settingsSection(
      { title: 'Tailscale' },
      dynamicChild(state, current => current && statusRow(kit, current)),
      settingsRow(
        'HTTPS through Tailscale',
        toggleSwitch({
          on: https,
          'aria-label': 'HTTPS through Tailscale',
          disabled: () => busy.get() || (!state.get()?.running && !https()),
          onClick: toggle,
        }),
        () => helpText(state.get()?.name),
      ),
      dynamicChild(
        state.map(current => (current?.serving && current.httpsUrl) || ''),
        url => (url ? servingRow(kit, url) : null),
      ),
      dynamicChild(
        state.map(current => current?.error ?? ''),
        error => (error ? errorRow(error) : null),
      ),
    ),
  )
}
