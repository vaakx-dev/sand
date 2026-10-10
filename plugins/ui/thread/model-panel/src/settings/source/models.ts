import type { SourceInfo } from '@sand/llm-accounts/contract'
import { derive, div, dynamicChild, hint, list, p, quietButton, segmented, settingsSection, show, textInput, type Choice } from '@sand/dom'
import { addRow } from './add'
import type { Catalog } from './catalog'
import type { Filter, Mode } from './filter'
import { modelRow } from './row'

const toolbar = (catalog: Catalog, filter: Filter) => {
  const total = derive(() => catalog.models.get()?.length ?? 0)
  const shown = derive(() => catalog.models.get()?.filter(model => !model.hidden).length ?? 0)
  const choices = (): Choice<Mode>[] => [
    { value: 'shown', label: `Shown ${shown.get()}` },
    { value: 'all', label: `All ${total.get()}` },
  ]
  return div(
    { class: 'flex flex-wrap items-center gap-2' },
    div(
      { class: 'flex min-w-48 flex-1' },
      textInput({
        type: 'search',
        placeholder: () => (total.get() ? `Search ${total.get()} models` : 'Search models'),
        'aria-label': 'Search models',
        bindValue: filter.query,
      }),
    ),
    dynamicChild(
      derive(() => `${shown.get()} ${total.get()}`),
      () => segmented(choices(), filter.mode, mode => filter.mode.set(mode), { label: 'Which models' }),
    ),
  )
}

const emptyText = (catalog: Catalog, filter: Filter) => {
  if (filter.query.get().trim()) return `No models match "${filter.query.get().trim()}"`
  if (filter.mode.get() === 'shown' && catalog.models.get()?.length) return 'None shown yet. Pick some under All.'
  return 'No models yet'
}

const status = (catalog: Catalog, filter: Filter) =>
  dynamicChild(
    derive(() => (catalog.error.get() && !catalog.models.get() ? 'error' : !catalog.models.get() ? 'loading' : filter.found.get().length ? 'rows' : 'empty')),
    state => {
      if (state === 'error')
        return div(
          { class: 'flex flex-wrap items-center gap-3 bg-neutral-900 px-4 py-3' },
          p({ class: 'min-w-0 flex-1 text-xs wrap-anywhere text-danger-400' }, () => catalog.error.get()),
          quietButton({ size: 'sm', onClick: () => void catalog.reload() }, 'Try again'),
        )
      if (state === 'rows') return div({ class: 'hidden' })
      return div({ class: 'bg-neutral-900' }, hint(() => (state === 'loading' ? 'Loading…' : emptyText(catalog, filter))))
    },
  )

export const modelsSection = (source: SourceInfo, catalog: Catalog, filter: Filter) =>
  div(
    { class: 'flex flex-col gap-2' },
    source.search ? toolbar(catalog, filter) : null,
    settingsSection(
      {},
      status(catalog, filter),
      list(filter.rows, model => model.id, row => modelRow(row, catalog, filter.keep), div({ class: 'contents' })),
      show(
        filter.more.map(more => more > 0),
        () => div({ class: 'bg-neutral-900 px-2 py-1' }, quietButton({ size: 'sm', onClick: filter.showMore }, () => `Show more (${filter.more.get()})`)),
      ),
      source.slugs ? addRow(source, catalog, model => filter.keep(model.id)) : null,
    ),
  )
