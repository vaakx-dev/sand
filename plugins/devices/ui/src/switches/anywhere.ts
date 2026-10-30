import type { TailscaleState } from '@sand/devices-contract'
import { derive, div, dynamicChild, show, sig } from '@vaakx-dev/vrui'
import type { PcSettings } from '../data/pc-settings'
import type { Ui } from '../ui'
import { tailscaleProblem, type TailscaleProblem } from './problem'

const blurb = 'Open sand on any network from phones and browsers signed in to your Tailscale.'

const problemRow = (ui: Ui, problem: TailscaleProblem) => {
  const { errorText, icon, openTab, secondaryAction, sectionRow } = ui.kit
  const { fix } = problem
  return sectionRow(
    { class: 'flex-wrap' },
    div({ class: 'min-w-48 flex-1 py-1' }, errorText(problem.text)),
    fix ? secondaryAction({ size: 'sm', onClick: () => openTab(fix.url) }, fix.label, icon('external', 'sm')) : null,
  )
}

const addressRow = (ui: Ui, url: string) => {
  const { copyButton, settingsRow } = ui.kit
  return settingsRow({ title: 'Address for phones', detail: div({ class: 'font-mono wrap-anywhere' }, url) }, copyButton({ text: () => url, label: 'Copy', surface: 'group' }))
}

const switchable = (state: TailscaleState | undefined) => Boolean(state?.installed && (state.running || state.https))

export const anywhereRows = (ui: Ui, settings: PcSettings, name: () => string) => {
  const { errorState, loadingState, settingsRow, toggleSwitch } = ui.kit
  const { tailscale } = settings
  const busy = sig(false)
  const state = tailscale.value
  const toggle = async () => {
    busy.set(true)
    const on = !state.get()?.https
    await ui.toasts.attempt(`Couldn’t turn ${on ? 'on' : 'off'} Reach from anywhere on ${name()}`, settings.setHttps(on))
    busy.set(false)
  }
  const problem = derive(() => {
    const current = state.get()
    return current ? tailscaleProblem(current, name()) : undefined
  })
  return [
    show(
      () => !tailscale.loaded.get() && !tailscale.error.get(),
      () => loadingState({ surface: 'group' }),
    ),
    dynamicChild(tailscale.error, error =>
      error ? errorState({ surface: 'group', text: `Couldn’t check Tailscale on ${name()}: ${error}`, retry: () => void tailscale.refresh() }) : null,
    ),
    show(tailscale.loaded, () =>
      settingsRow(
        { title: 'Tailscale', detail: blurb },
        toggleSwitch({
          on: () => state.get()?.https ?? false,
          'aria-label': 'Reach from anywhere with Tailscale',
          disabled: () => busy.get() || !switchable(state.get()),
          onClick: () => void toggle(),
        }),
      ),
    ),
    dynamicChild(
      state.map(current => (current?.serving && current.httpsUrl) || ''),
      url => (url ? addressRow(ui, url) : null),
    ),
    dynamicChild(problem, found => (found ? problemRow(ui, found) : null)),
  ]
}
