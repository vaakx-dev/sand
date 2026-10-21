import type { ModelInfo } from '@sand/accounts/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { div, keys, show, sig } from '@vaakx-dev/vrui'
import type { Catalog } from './catalog'

export const addRow = (kit: Kit, catalog: Catalog, added: (model: ModelInfo) => void) => {
  const { errorText, secondaryAction, textInput } = kit
  const name = sig('')
  const busy = sig(false)
  const error = sig('')
  const ready = () => !busy.get() && !!name.get().trim()

  const add = async () => {
    if (!ready()) return
    busy.set(true)
    error.set('')
    try {
      added(await catalog.add(name.get().trim()))
      name.set('')
    } catch (failure) {
      error.set(errorMessage(failure))
    } finally {
      busy.set(false)
    }
  }

  return div(
    { class: 'flex flex-col gap-2 bg-neutral-900 px-4 py-3' },
    div(
      { class: 'flex items-center gap-2' },
      textInput({
        placeholder: 'Add by model id',
        'aria-label': 'Model slug',
        bindValue: name,
        onInput: () => error.set(''),
        onKeyDown: keys({ Enter: () => void add() }),
      }),
      secondaryAction({ disabled: () => !ready(), onClick: () => void add() }, 'Add'),
    ),
    show(
      () => !!error.get(),
      () => errorText(() => error.get()),
    ),
  )
}
