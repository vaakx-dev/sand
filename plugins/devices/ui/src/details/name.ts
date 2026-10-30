import { pcRename } from '@sand/devices-contract'
import { errorMessage, oneLine } from '@sand/util'
import { div, keys, show, sig } from '@vaakx-dev/vrui'
import { field } from '../shared/parts'
import type { Ui } from '../ui'

export const nameField = (ui: Ui, pc: string) => {
  const { errorText, textInput } = ui.kit
  const current = () => ui.data.nameOf(pc)
  const value = sig(current())
  const error = sig('')
  const busy = sig(false)

  const rename = (name: string) =>
    ui.ctx.pcs.online(pc) ? ui.ctx.wire.call(pcRename, { name }, pc) : ui.data.devices.rename(pc, name)

  const commit = async () => {
    const name = oneLine(value.get()).trim()
    if (!name) return value.set(current())
    if (name === current() || busy.get()) return
    busy.set(true)
    error.set('')
    try {
      await rename(name)
      await ui.data.devices.refresh()
    } catch (failure) {
      error.set(`Couldn’t rename it: ${errorMessage(failure)}`)
    } finally {
      busy.set(false)
    }
  }

  return div(
    { class: 'flex flex-col gap-1' },
    field(
      'Name',
      textInput({
        'aria-label': 'Name',
        bindValue: value,
        disabled: busy,
        onBlur: () => void commit(),
        onKeyDown: keys({ Enter: () => void commit(), Escape: () => value.set(current()) }, { stop: true }),
      }),
    ),
    show(error.map(Boolean), () => errorText(error)),
  )
}
