import { div, span } from '@vaakx-dev/vrui'
import { platformWords } from '../requests/words'
import { dateWords } from '../shared/time'
import { toneDot } from '../status/dot'
import { statusWords, toneOf } from '../status/words'
import type { Ui } from '../ui'
import { nameField } from './name'
import { routesSection } from './routes/section'
import { pcSwitches } from './switches'

const statusBlock = (ui: Ui, pc: string) => {
  const view = ui.data.view(pc)
  const words = () => {
    const current = view.get()
    if (!current) return 'Not one of your PCs any more'
    const text = statusWords(current, ui.data.nameOf, ui.device(), ui.data.now.get())
    return current.online ? `Connected · ${text}` : text
  }
  const added = () => {
    const record = ui.data.devices.get(pc)
    const platform = platformWords(view.get()?.platform ?? record?.platform)
    const when = record && `added ${dateWords(record.added)} by ${ui.data.nameOf(record.addedBy)}`
    return [platform, when].filter(Boolean).join(' · ')
  }
  return div(
    { class: 'flex flex-col gap-1' },
    div(
      { class: 'flex items-center gap-2 text-sm text-neutral-100' },
      toneDot(ui.kit, () => (view.get() ? toneOf(view.get()!.status) : 'off'), words),
      span({ class: 'min-w-0' }, words),
    ),
    div({ class: 'text-xs text-neutral-400' }, added),
  )
}

const removeSection = (ui: Ui, pc: string, close: () => void) => {
  const { rowAction, settingsRow, settingsSection } = ui.kit
  const name = () => ui.data.nameOf(pc)
  const remove = async () => {
    const done = await ui.toasts.attempt(`Couldn’t remove ${name()}`, ui.data.devices.remove(pc).then(() => true))
    if (done) close()
  }
  return settingsSection(
    {},
    settingsRow(
      { title: 'Remove PC', detail: () => `${name()} and your other devices stop trusting each other. To use it again, add it again.` },
      rowAction({ label: 'Remove PC', danger: true, run: () => void remove() }),
    ),
  )
}

export const detailsSheet = (ui: Ui, pc: string, close: () => void) => {
  const { overlay, primaryAction, sheet, sheetBody, sheetFoot, sheetHead } = ui.kit
  const name = () => ui.data.nameOf(pc)
  const home = pc === ui.data.homeId()
  return overlay(
    close,
    sheet(
      { 'aria-label': name, size: 'md' },
      sheetHead({ title: name, close }),
      sheetBody(
        {},
        nameField(ui, pc),
        statusBlock(ui, pc),
        routesSection(ui, pc),
        ...pcSwitches(ui, pc),
        home ? null : removeSection(ui, pc, close),
      ),
      sheetFoot(primaryAction({ onClick: close }, 'Done')),
    ),
  )
}
