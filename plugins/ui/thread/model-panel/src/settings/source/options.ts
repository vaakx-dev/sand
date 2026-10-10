import type { SourceInfo } from '@sand/llm-accounts/contract'
import { ago, clock, div, icon, quietButton, settingsRow, settingsSection, sig, span, toggleSwitch } from '@sand/dom'
import type { Kit } from '../kit'

const checkedText = (at: number | undefined, now: number) => {
  if (!at) return 'Not checked yet'
  const since = ago(Math.min(at, now))
  return since === 'now' ? 'Checked just now' : `Checked ${since} ago`
}

const refreshLine = (kit: Kit, source: () => SourceInfo) => {
  const busy = sig(false)
  const now = clock(30_000)
  const refresh = async () => {
    busy.set(true)
    await kit.run({ type: 'models.refresh', source: source().id })
    busy.set(false)
  }
  return div(
    { class: 'flex flex-wrap items-center gap-x-3 gap-y-1 px-1' },
    span({ class: 'text-xs text-neutral-500' }, () => checkedText(source().checked, now.get())),
    span({ class: 'min-w-0 flex-1 text-xs wrap-anywhere text-danger-400' }, () => source().error ?? ''),
    quietButton({ size: 'sm', disabled: busy, onClick: () => void refresh() }, icon('reload', 12), () => (busy.get() ? 'Checking…' : 'Check for new models')),
  )
}

export const optionsSection = (kit: Kit, source: () => SourceInfo) => {
  const show = () => source().newModels === 'show'
  return div(
    { class: 'flex flex-col gap-2' },
    settingsSection(
      {},
      settingsRow(
        'Show new models automatically',
        toggleSwitch({
          on: show,
          'aria-label': 'Show new models automatically',
          onClick: () => void kit.run({ type: 'models.newModels', source: source().id, mode: show() ? 'hide' : 'show' }),
        }),
        () => (show() ? 'New models appear in the picker as soon as they are found' : 'New models wait here, marked New'),
      ),
    ),
    refreshLine(kit, source),
  )
}
