import { errorMessage, oneLine } from '@sand/util'
import { keys, sig } from '@vaakx-dev/vrui'
import type { Ui } from '../ui'

export const nameField = (ui: Ui, pc: string) => {
  const { field, textInput } = ui.kit
  const current = () => ui.data.nameOf(pc)
  const value = sig(current())
  const error = sig('')
  const busy = sig(false)

  const commit = async () => {
    const name = oneLine(value.get()).trim()
    if (!name) return value.set(current())
    if (name === current() || busy.get()) return
    busy.set(true)
    error.set('')
    try {
      await ui.data.devices.rename(pc, name)
      await ui.data.devices.refresh()
    } catch (failure) {
      error.set(`Couldn’t rename it: ${errorMessage(failure)}`)
    } finally {
      busy.set(false)
    }
  }

  return field(
    { label: 'Name', error },
    textInput({
      bindValue: value,
      disabled: busy,
      onBlur: () => void commit(),
      onKeyDown: keys({ Enter: () => void commit(), Escape: () => value.set(current()) }, { stop: true }),
    }),
  )
}
