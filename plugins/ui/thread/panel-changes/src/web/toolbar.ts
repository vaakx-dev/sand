import type { Kit } from '@sand/ui-kit/contract'
import { div, show, span, type Derive } from '@vaakx-dev/vrui'
import type { FileChange } from '../changes/collect'
import { totals } from '../changes/lines'
import { counts } from './counts'
import type { Display } from './display'
import { fileEntry } from './files/entry'
import type { ChangesState } from './view'

const turnName = (turn: number | undefined) => (turn === undefined ? 'All turns' : `Turn ${turn}`)

const turnPicker = ({ chipButton, choiceItem, dropdown }: Kit, state: ChangesState) =>
  dropdown({
    trigger: (press, open) => chipButton({ active: open, menu: true, ...press }, () => turnName(state.turn.get())),
    items: close =>
      [undefined, ...(state.changes.get()?.turns ?? [])].map(turn =>
        choiceItem(
          {
            selected: () => state.turn.get() === turn,
            onClick: () => {
              close()
              state.turn.set(turn)
            },
          },
          span({ class: 'min-w-0 flex-1' }, turnName(turn)),
        ),
      ),
  })

const filesPicker = (kit: Kit, files: Derive<FileChange[]>, state: ChangesState) => {
  const { chipButton, dropdown, popoverItem } = kit
  return dropdown({
    trigger: (press, open) => chipButton({ active: open, menu: true, ...press }, 'Files'),
    menuClass: 'max-w-xs',
    items: close =>
      files.get().map(file =>
        popoverItem(
          {
            onClick: () => {
              close()
              state.reveal(file)
            },
          },
          fileEntry(kit, file.path, () => state.viewed.has(file)),
        ),
      ),
  })
}

const layouts = [
  { value: false, label: 'Unified' },
  { value: true, label: 'Split' },
]

const progress = (done: () => number, total: () => number) =>
  span(
    { class: 'flex shrink-0 items-center gap-2 tabular-nums' },
    () => `${done()}/${total()} viewed`,
    span(
      { class: 'h-1 w-12 overflow-hidden rounded-full bg-neutral-800' },
      span({ class: 'block h-full bg-accent-400 transition-all', style: () => ({ width: `${(done() / Math.max(1, total())) * 100}%` }) }),
    ),
  )

export const toolbar = (kit: Kit, state: ChangesState, display: Display, files: Derive<FileChange[]>) => {
  const { icon, iconButton, segmented } = kit
  const sum = () => totals(files.get())
  return div(
    { class: 'flex h-10 shrink-0 items-center gap-2 border-b border-neutral-800 px-3 text-xs text-neutral-400', hidden: () => !state.changes.get()?.turns.length },
    turnPicker(kit, state),
    show(
      () => !display.wide(),
      () => filesPicker(kit, files, state),
    ),
    show(
      () => !display.compact(),
      () => segmented(layouts, display.splitChoice, value => display.splitChoice.set(value), { label: 'Diff layout' }),
    ),
    span({ class: 'flex-1' }),
    progress(
      () => state.viewed.count(files.get()),
      () => files.get().length,
    ),
    show(
      () => !display.split(),
      () =>
        iconButton(
          { size: 'sm', title: 'Wrap long lines', active: display.wrapChoice, 'aria-pressed': () => String(display.wrapChoice.get()), onClick: display.wrapChoice.toggle() },
          icon('wrap', 14),
        ),
    ),
    show(
      () => !display.compact(),
      () =>
        counts(
          () => sum().add,
          () => sum().del,
        ),
    ),
  )
}
