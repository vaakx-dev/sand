import { noteAbout, noteChangeWire, noteLimit, notesRead, noteWrite, type Note } from '@sand/bot-memory/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, effect, show, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { confirmButton } from '../confirm'
import type { BotsContext } from '../context'
import { changedNote } from './changed'

const noteRow = (kit: BotsContext['kit'], note: Sig<Note>, write: (note: Note) => Promise<unknown>) => {
  const { expandRow, expandToggle, primaryAction, rowDetail, settingsRow, textArea } = kit
  const { name } = note.get()
  const open = sig(false)
  const saved = sig(note.get().text)
  const draft = sig(note.get().text)
  const saving = sig(false)
  const take = (text: string) => {
    saved.set(text)
    draft.set(text)
  }
  effect(() => {
    const { text } = note.get()
    untrack(() => {
      if (draft.get() === saved.get() || draft.get() === text) take(text)
    })
  })
  const outdated = derive(() => note.get().text !== saved.get())

  const save = () => {
    saving.set(true)
    void write({ name, text: draft.get() }).finally(() => saving.set(false))
  }

  const editor = () =>
    rowDetail(
      div(
        { class: 'flex flex-col gap-2' },
        textArea({ bindValue: draft, rows: 14, 'aria-label': name, class: 'font-mono' }),
        show(outdated, () => changedNote(kit, 'The bot rewrote this note.', () => take(note.get().text))),
        div(
          { class: 'flex flex-wrap items-center justify-between gap-2' },
          span({ class: 'text-xs text-neutral-400' }, () => `${draft.get().trim().length.toLocaleString()} of ${noteLimit.toLocaleString()} characters`),
          div(
            { class: 'flex items-center gap-2' },
            confirmButton(kit, { label: 'Delete', confirm: 'Delete for good', run: () => write({ name, text: '' }) }),
            primaryAction({ size: 'sm', disabled: () => saving.get() || !draft.get().trim() || draft.get() === saved.get(), onClick: save }, 'Save'),
          ),
        ),
      ),
    )

  return expandRow(
    {},
    settingsRow({ title: name, detail: span({ class: 'block truncate' }, () => noteAbout(note.get())), class: 'min-w-0' }, expandToggle(open, 'Edit')),
    show(open, editor),
  )
}

export const notesSection = (ctx: BotsContext, bot: string) => {
  const { emptyState, errorText, loadingState, rowDetail, rowList, settingsSection } = ctx.kit
  const notes = sig<Note[] | undefined>(undefined)
  const failure = sig<string | undefined>(undefined)

  const attempt = (work: () => Promise<unknown>) => {
    failure.set(undefined)
    return work().catch(error => failure.set(errorMessage(error)))
  }
  const apply = (note: Note) => {
    const others = (notes.get() ?? []).filter(found => found.name !== note.name)
    notes.set(note.text ? [...others, note].sort((a, b) => (a.name < b.name ? -1 : 1)) : others)
  }
  const write = (note: Note) => attempt(() => ctx.wire.call(noteWrite, { bot, ...note }).then(() => apply(note)))
  void attempt(() => ctx.wire.call(notesRead, { bot }).then(found => notes.set(found)))
  const stop = ctx.wire.on(noteChangeWire, ([changed, note]) => {
    if (changed === bot && notes.get()) apply(note)
  })

  const state = derive(() => {
    const found = notes.get()
    if (!found) return 'loading'
    return found.length ? 'notes' : 'empty'
  })

  return div(
    { class: 'contents', onMount: () => stop },
    settingsSection(
      { title: 'Notes' },
      dynamicChild(state, shown => {
        if (shown === 'loading') return loadingState({ surface: 'group' })
        if (shown === 'empty') return emptyState({ surface: 'group', text: 'No notes yet. The bot writes notes on its work when its conversation is compacted.' })
        return rowList(
          notes.map(found => found ?? []),
          note => note.name,
          note => noteRow(ctx.kit, note, write),
        )
      }),
      show(
        () => Boolean(failure.get()),
        () => rowDetail(span({ class: 'pt-3' }, errorText(() => failure.get() ?? ''))),
      ),
    ),
  )
}
