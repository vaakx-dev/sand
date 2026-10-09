import type { TailscaleState } from '@sand/protocol'
import { copyButton, div, dot, dynamicChild, p, settingsRow, settingsSection, show, sig, span, toggleSwitch } from '@sand/dom'
import { linkText } from '../components'
import type { DeviceSource } from '../source'

const hidden = () => div({ class: 'hidden' })

const status = (tone: 'neutral' | 'warning' | 'success', label: string) =>
  span({ class: 'flex min-w-0 items-center gap-2' }, dot(tone), span({ class: 'truncate' }, label))

const statusRow = (state: TailscaleState) => {
  if (!state.installed) return settingsRow(status('neutral', 'Not installed'), null, 'Install Tailscale to reach sand away from home')
  if (!state.running) return settingsRow(status('warning', 'Not connected'), null, 'Open Tailscale on this PC and sign in')
  return settingsRow(status('success', state.name ? `Connected as ${state.name}` : 'Connected'), null, state.ip)
}

const servingRow = (url: string) =>
  div(
    { class: 'flex items-center gap-2 bg-neutral-900 px-4 py-2' },
    linkText(url),
    copyButton({ text: () => url, label: 'Copy' }),
  )

const errorRow = (error: string) => div({ class: 'bg-neutral-900 px-4 py-3' }, p({ class: 'text-xs wrap-anywhere whitespace-pre-wrap text-danger-400' }, error))

const helpText = (name?: string) =>
  `Runs tailscale serve so phones can open sand at ${name ? `https://${name}` : 'an https address'} and install it as an app. This changes this PC’s Tailscale serve settings.`

export const tailscaleSection = (source: DeviceSource) => {
  const busy = sig(false)
  const state = source.tailscale
  const https = () => state.get()?.https ?? false
  const toggle = async () => {
    busy.set(true)
    try {
      await source.setHttps(!https())
    } catch (error) {
      source.fail(error)
    } finally {
      busy.set(false)
    }
  }
  return show(state.map(Boolean), () =>
    settingsSection(
      { title: 'Tailscale' },
      dynamicChild(state, current => (current ? statusRow(current) : hidden())),
      settingsRow(
        'HTTPS through Tailscale',
        toggleSwitch({
          on: https,
          'aria-label': 'HTTPS through Tailscale',
          disabled: () => busy.get() || (!state.get()?.running && !https()),
          onClick: () => void toggle(),
        }),
        () => helpText(state.get()?.name),
      ),
      dynamicChild(
        state.map(current => (current?.serving && current.httpsUrl) || ''),
        url => (url ? servingRow(url) : hidden()),
      ),
      dynamicChild(
        state.map(current => current?.error ?? ''),
        error => (error ? errorRow(error) : hidden()),
      ),
    ),
  )
}
