import type { Wire } from '@sand/devices-contract'
import { detailsLimit, logbookChange, logbookRemove, titleLimit, type Entry } from '@sand/logbook/contract'
import type { Markdown } from '@sand/markdown/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, form, p, preventThen, show, sig, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { linkSource } from './links'

interface Focus {
  id: string
  mode: 'open' | 'edit'
}

interface EntryParts {
  kit: Kit
  markdown: Markdown
  wire: Wire
  report(error: unknown): void
  focus: Sig<Focus | undefined>
  projectOf(entry: Entry): string | undefined
  pickTag(tag: string): void
}

const tagsOf = (text: string) => text.split(',').map(tag => tag.trim()).filter(Boolean)

const editForm = (parts: EntryParts, entry: Entry) => {
  const { kit } = parts
  const title = sig(entry.title)
  const details = sig(entry.details)
  const tags = sig(entry.tags.join(', '))
  const saving = sig(false)
  const failure = sig('')
  const close = () => parts.focus.set({ id: entry.id, mode: 'open' })
  const save = () => {
    saving.set(true)
    parts.wire
      .call(logbookChange, { id: entry.id, title: title.get(), details: details.get(), tags: tagsOf(tags.get()) })
      .then(close, error => failure.set(errorMessage(error)))
      .finally(() => saving.set(false))
  }
  return form(
    { class: 'flex flex-col gap-3', onSubmit: preventThen(save) },
    kit.field({ label: 'Title' }, kit.textInput({ bindValue: title, maxLength: titleLimit, onMount: node => node.focus() })),
    kit.field({ label: 'Details' }, kit.textArea({ bindValue: details, rows: 6, maxLength: detailsLimit })),
    kit.field({ label: 'Tags', hint: 'Separate tags with commas' }, kit.textInput({ bindValue: tags })),
    show(
      () => Boolean(failure.get()),
      () => kit.errorText(() => failure.get()),
    ),
    div(
      { class: 'flex justify-end gap-2' },
      kit.quietButton({ size: 'sm', onClick: close }, 'Cancel'),
      kit.primaryAction({ size: 'sm', type: 'submit', disabled: () => saving.get() || !title.get().trim() }, 'Save'),
    ),
  )
}

const removeAction = (parts: EntryParts, entry: Entry) => ({
  id: 'remove',
  label: 'Remove entry',
  danger: true,
  confirm: 'Remove this entry from the Logbook? It can’t be brought back.',
  run: () => parts.wire.call(logbookRemove, { id: entry.id }).catch(parts.report),
})

const actions = (parts: EntryParts, entry: Entry) => {
  const { kit } = parts
  return div(
    { class: 'flex shrink-0 items-center gap-1' },
    kit.iconButton({ size: 'sm', title: 'Edit entry', 'aria-label': 'Edit entry', onClick: () => parts.focus.set({ id: entry.id, mode: 'edit' }) }, kit.icon('pencil', 'sm')),
    kit.iconButton({ size: 'sm', title: 'Remove entry', 'aria-label': 'Remove entry', onClick: event => kit.confirm(event)(removeAction(parts, entry)) }, kit.icon('trash', 'sm')),
  )
}

const metaRow = (parts: EntryParts, entry: Entry) => {
  const { kit } = parts
  const project = parts.projectOf(entry)
  return div(
    { class: 'flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-500' },
    entry.author ? span(entry.author.name) : null,
    project ? span(project) : null,
    ...entry.tags.map(tag => kit.linkButton({ class: 'text-xs', title: `Show entries tagged ${tag}`, onClick: () => parts.pickTag(tag) }, `#${tag}`)),
    ...entry.links.map(link => span({ class: 'min-w-0 truncate' }, ...parts.markdown.inline(linkSource(link)))),
  )
}

const readView = (parts: EntryParts, entry: Entry, open: () => boolean) => {
  const toggle = () => parts.focus.set(open() ? undefined : { id: entry.id, mode: 'open' })
  return div(
    { class: 'flex min-w-0 flex-col gap-1' },
    div(
      { class: 'flex min-w-0 items-start gap-2' },
      parts.kit.plainButton(
        { class: 'flex min-w-0 flex-1 flex-col gap-px rounded-sm text-left', 'aria-expanded': () => String(open()), onClick: toggle },
        span({ class: ['min-w-0 text-sm font-medium text-neutral-100', () => (open() ? 'wrap-anywhere' : 'truncate')] }, entry.title),
        show(
          () => !open() && Boolean(entry.details),
          () => p({ class: 'line-clamp-2 text-sm text-neutral-400' }, entry.details),
        ),
      ),
      show(open, () => actions(parts, entry)),
    ),
    show(
      () => open() && Boolean(entry.details),
      () => div({ class: 'flex min-w-0 flex-col gap-2 text-sm wrap-anywhere text-neutral-200' }, ...parts.markdown.nodes(entry.details)),
    ),
    metaRow(parts, entry),
  )
}

const entryView = (parts: EntryParts, entry: Sig<Entry>) => {
  const mode = derive(() => (parts.focus.get()?.id === entry.get().id ? parts.focus.get()?.mode : undefined))
  const open = () => mode.get() !== undefined
  return div(
    { class: 'px-2 py-2' },
    dynamicChild(
      derive(() => mode.get() === 'edit'),
      editing => (editing ? editForm(parts, untrack(() => entry.get())) : dynamicChild(entry, current => readView(parts, current, open))),
    ),
  )
}

export { entryView, type EntryParts, type Focus }
