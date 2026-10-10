import { contextMenu, derive, div, dropdown, hint, icon, list, popoverItem, secondaryAction, show, span, type Sig } from '@sand/dom'
import { plural } from '@sand/kit'
import type { Changes } from '../changes/collect'
import { totals } from '../changes/lines'
import { counts } from './counts'
import { fileView } from './file'

export interface Reveal {
  key: string
}

export interface ChangesState {
  changes: Sig<Changes | undefined>
  empty: Sig<string>
  turn: Sig<number | undefined>
  closed: Sig<Record<string, boolean>>
  revealed: Sig<Reveal | undefined>
  copy: (text: string, what: string) => void
}

const turnName = (turn: number | undefined) => (turn === undefined ? 'All turns' : `Turn ${turn}`)

const turnPicker = (state: ChangesState) =>
  dropdown({
    trigger: toggle =>
      secondaryAction({ size: 'sm', onClick: toggle }, () => turnName(state.turn.get()), span({ class: 'inline-flex text-neutral-400' }, icon('down', 12))),
    items: close =>
      [undefined, ...(state.changes.get()?.turns ?? [])].map(turn =>
        popoverItem(
          {
            active: () => state.turn.get() === turn,
            onClick: () => {
              close()
              state.turn.set(turn)
            },
          },
          turnName(turn),
        ),
      ),
  })


export const changesView = (state: ChangesState, toggle: (key: string) => void) => {
  const files = derive(() => state.changes.get()?.files ?? [])
  const sum = derive(() => totals(files.get()))
  const menu = contextMenu()
  return div(
    { class: 'min-h-full pb-4' },
    menu.view(),
    div(
      { class: 'flex h-10 items-center gap-3 pl-4 pr-4 text-xs text-neutral-400', hidden: state.changes.map(changes => !changes?.turns.length) },
      turnPicker(state),
      span({ class: 'flex-1' }),
      span({ class: 'text-neutral-500' }, () => plural(state.changes.get()?.files.length ?? 0, 'file')),
      counts(
        () => sum.get().add,
        () => sum.get().del,
      ),
    ),
    list(files, file => file.key, file => fileView(file, state, toggle, menu)),
    show(
      files.map(items => !items.length),
      () => hint(state.empty),
    ),
  )
}
