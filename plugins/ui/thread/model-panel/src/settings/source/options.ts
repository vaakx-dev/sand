import type { SourceInfo } from '@sand/llm-accounts/contract'
import { ago } from '@sand/kit'
import { clock, div, sig, span } from '@vaakx-dev/vrui'
import type { Page } from '../page'

const checkedText = (at: number | undefined, now: number) => {
  if (!at) return 'Not checked yet'
  const since = ago(Math.min(at, now))
  return since === 'now' ? 'Checked just now' : `Checked ${since} ago`
}

const refreshLine = (page: Page, source: () => SourceInfo) => {
  const { errorText, icon, quietButton } = page.ctx.kit
  const busy = sig(false)
  const now = clock(30_000)
  const refresh = async () => {
    busy.set(true)
    await page.run({ type: 'models.refresh', source: source().id })
    busy.set(false)
  }
  return div(
    { class: 'flex flex-wrap items-center gap-x-3 gap-y-1 px-1' },
    span({ class: 'text-xs text-neutral-500' }, () => checkedText(source().checked, now.get())),
    div({ class: 'min-w-0 flex-1' }, errorText(() => source().error ?? '')),
    quietButton({ size: 'sm', disabled: busy, onClick: () => void refresh() }, icon('reload', 14), () => (busy.get() ? 'Checking…' : 'Check now')),
  )
}

export const optionsSection = (page: Page, source: () => SourceInfo) => {
  const { settingsRow, settingsSection, toggleSwitch } = page.ctx.kit
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
          onClick: () => void page.run({ type: 'models.newModels', source: source().id, mode: show() ? 'hide' : 'show' }),
        }),
        () => (show() ? 'New models appear in the picker as soon as they are found' : 'New models wait here, marked New'),
      ),
    ),
    refreshLine(page, source),
  )
}
