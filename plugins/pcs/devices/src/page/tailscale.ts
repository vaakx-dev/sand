import type { TailscaleState } from '@sand/host-tailscale/contract'
import { copyButton, div, dot, dynamicChild, errorRow, settingsRow, settingsSection, show, sig, span, toggleSwitch, type Tone } from '@sand/dom'
import { linkText } from '../components'
import type { DeviceSource } from '../source'

const status = (tone: Tone, label: string) => span({ class: 'flex min-w-0 items-center gap-2' }, dot(tone), span({ class: 'truncate' }, label))

const statusRow = (state: TailscaleState) => {
  if (!state.installed) return settingsRow(status('neutral', 'Not installed'), null, 'Install Tailscale to reach sand away from home')
  if (!state.running) return settingsRow(status('warning', 'Not connected'), null, 'Open Tailscale on this PC and sign in')
  return settingsRow(status('success', state.name ? `Connected as ${state.name}` : 'Connected'), null, state.ip)
}

const servingRow = (url: string) =>
  div({ class: 'flex items-center gap-2 bg-neutral-900 px-4 py-2' }, linkText(url), copyButton({ text: () => url, label: 'Copy' }))

const helpText = (name?: string) =>
  `Runs tailscale serve so phones can open sand at ${name ? `https://${name}` : 'an https address'} and install it as an app. This changes this PC’s Tailscale serve settings.`

export const tailscaleSection = (source: DeviceSource) => {
  const busy = sig(false)
  const state = source.tailscale
  const https = () => state.get()?.https ?? false
  const toggle = () => {
    busy.set(true)
    source
      .setHttps(!https())
      .catch(source.fail)
      .finally(() => busy.set(false))
  }
  return show(state.map(Boolean), () =>
    settingsSection(
      { title: 'Tailscale' },
      dynamicChild(state, current => current && statusRow(current)),
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
        url => (url ? servingRow(url) : null),
      ),
      dynamicChild(
        state.map(current => current?.error ?? ''),
        error => (error ? errorRow(error) : null),
      ),
    ),
  )
}
