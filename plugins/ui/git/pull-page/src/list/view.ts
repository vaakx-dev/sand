import type { InboxView } from '@sand/pull-inbox/contract'
import { clock, derive, div, dynamicChild, intersectionObserver, list, show, type Sig } from '@vaakx-dev/vrui'
import type { StateFilter } from '../address/query'
import { pageColumn } from '../page/column'
import type { PageParts } from '../parts'
import { type ListEntry, listEntries } from './groups'
import { pullRow } from './row'
import { listSkeleton } from './skeleton'

const preload = '400px 0px'

const stateWords: Record<StateFilter, string> = { open: 'open ', merged: 'merged ', closed: 'closed ', all: '' }

const emptyText = (view: InboxView, state: StateFilter, q: string) => {
  if (q.trim()) return `No pull requests match “${q.trim()}”.`
  if (view === 'needs') return 'Nothing needs you right now.'
  if (view === 'mine') return `You have no ${stateWords[state]}pull requests.`
  if (view === 'reviewing') return `No ${stateWords[state]}pull requests ask for your review.`
  return `No ${stateWords[state]}pull requests in these projects.`
}

const groupHead = (parts: PageParts, entry: Sig<ListEntry>) => {
  const value = entry.get()
  return div({ class: 'px-2 pt-3' }, parts.kit.sectionHeading(value.kind === 'group' ? value.title : ''))
}

const entryView = (parts: PageParts, entry: Sig<ListEntry>, minute: ReturnType<typeof clock>) => {
  const value = entry.get()
  if (value.kind === 'group') return groupHead(parts, entry)
  const pull = entry.map(current => (current.kind === 'pull' ? current.pull : value.pull))
  return pullRow(parts, pull, minute)
}

const moreSentinel = (parts: PageParts) =>
  div(
    {
      class: 'flex min-h-8 items-center justify-center',
      onMount: node => {
        const root = node.closest('[data-pull-list]')
        intersectionObserver(
          node,
          seen => {
            if (seen.some(each => each.isIntersecting)) parts.list.loadMore()
          },
          { root, rootMargin: preload },
        )
      },
    },
    show(parts.list.more, () => parts.kit.spinner('sm')),
  )

const filledList = (parts: PageParts) => {
  const { list: model, kit } = parts
  const minute = clock(60_000)
  const entries = derive(() => listEntries(model.view.get(), model.pulls.get()))
  return div(
    { class: ['flex flex-col px-2 pb-6', pageColumn(parts)] },
    list(
      entries,
      entry => entry.key,
      entry => entryView(parts, entry, minute),
      div({ class: 'flex flex-col' }),
    ),
    dynamicChild(model.cursor, cursor => (cursor ? moreSentinel(parts) : null)),
    show(model.capped, () => div({ class: 'px-2 pt-2' }, kit.metaLine('Showing the newest results. Narrow the search to find older ones.'))),
  )
}

const emptyList = (parts: PageParts) =>
  parts.kit.emptyState({ text: () => emptyText(parts.list.view.get(), parts.query.state.get(), parts.query.q.get()) })

type Shown = 'loading' | 'failed' | 'empty' | 'filled'

export const listView = (parts: PageParts) => {
  const { list: model, kit } = parts
  const shown = derive((): Shown => {
    const phase = model.phase.get()
    if (phase !== 'ready') return phase
    return model.pulls.get().length ? 'filled' : 'empty'
  })
  return div(
    { class: 'min-h-0 flex-1 overflow-auto overscroll-contain', 'data-pull-list': '' },
    dynamicChild(shown, state => {
      if (state === 'loading') return div({ class: ['px-2', pageColumn(parts)] }, listSkeleton())
      if (state === 'failed') return div({ class: ['px-2', pageColumn(parts)] }, kit.errorState({ text: () => model.failure.get(), retry: () => model.load() }))
      if (state === 'empty') return div({ class: ['px-2', pageColumn(parts)] }, emptyList(parts))
      return filledList(parts)
    }),
  )
}
