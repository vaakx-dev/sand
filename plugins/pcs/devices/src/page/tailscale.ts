import type { TailscaleState } from '@sand/host-tailscale/contract'
import type { Kit, Tone } from '@sand/ui-kit/contract'
import { dynamicChild, show, sig, span } from '@vaakx-dev/vrui'
import type { DeviceSource } from '../source'

const status = ({ dot }: Kit, tone: Tone, label: string) => span({ class: 'flex min-w-0 items-center gap-2' }, dot(tone), span({ class: 'truncate' }, label))

const statusRow = (kit: Kit, state: TailscaleState) => {
  const { settingsRow } = kit
  if (!state.installed) return settingsRow({ title: status(kit, 'neutral', 'Not installed'), detail: 'Install Tailscale to reach sand away from home' })
  if (!state.running) return settingsRow({ title: status(kit, 'warning', 'Not connected'), detail: 'Open Tailscale on this PC and sign in' })
  return settingsRow({ title: status(kit, 'success', state.name ? `Connected as ${state.name}` : 'Connected'), detail: state.ip })
}

const servingRow = ({ copyButton, settingsRow }: Kit, url: string) =>
  settingsRow({ title: 'Address for phones', detail: url }, copyButton({ text: () => url, label: 'Copy', surface: 'group' }))

const helpText = (name?: string) =>
  `Runs tailscale serve so phones can open sand at ${name ? `https://${name}` : 'an https address'} and install it as an app. This changes this PC’s Tailscale serve settings.`

export const tailscaleSection = (kit: Kit, source: DeviceSource) => {
  const { errorState, settingsRow, settingsSection, toggleSwitch } = kit
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
        { title: 'HTTPS through Tailscale', detail: () => helpText(state.get()?.name) },
        toggleSwitch({
          on: https,
          'aria-label': 'HTTPS through Tailscale',
          disabled: () => busy.get() || (!state.get()?.running && !https()),
          onClick: toggle,
        }),
      ),
      dynamicChild(
        state.map(current => (current?.serving && current.httpsUrl) || ''),
        url => (url ? servingRow(kit, url) : null),
      ),
      dynamicChild(
        state.map(current => current?.error ?? ''),
        error => (error ? errorState({ surface: 'group', text: error }) : null),
      ),
    ),
  )
}
