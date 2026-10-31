import { pullLabel } from '@sand/github/contract'
import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import { detailView } from '../detail/view'
import { listView } from '../list/view'
import type { PageParts } from '../parts'
import { parsePull } from '../address/pull'
import { filtersRow } from './filters'
import { pageHead } from './head'
import { githubState, signedOutNotice } from './signed-out'

const listColumn = (parts: PageParts, hasDetail: () => boolean) =>
  div(
    {
      class: [
        'min-h-0 min-w-0 flex-col',
        () => (parts.narrow.get() && hasDetail() ? 'hidden' : 'flex'),
        () => (hasDetail() && !parts.narrow.get() ? 'w-96 shrink-0 border-r border-neutral-800' : 'mx-auto w-full max-w-4xl'),
      ],
    },
    listView(parts),
  )

const detailColumn = (parts: PageParts) =>
  dynamicChild(
    derive(() => {
      const chosen = parts.selected.get()
      return chosen ? pullLabel(chosen) : ''
    }),
    key => {
      const chosen = parsePull(key)
      return chosen ? div({ class: 'flex min-h-0 min-w-0 flex-1 flex-col' }, detailView(parts, chosen)) : null
    },
  )

export const pageView = (parts: PageParts) => {
  const { kit } = parts
  const hasDetail = () => Boolean(parts.selected.get())
  const escape = () => (hasDetail() ? parts.select(undefined) : parts.close())
  return div(
    { class: 'flex min-h-0 min-w-0 flex-1 flex-col', onMount: node => kit.dismissible(node, escape, { overlay: false }) },
    show(
      () => !(parts.narrow.get() && hasDetail()),
      () => div({ class: 'flex shrink-0 flex-col' }, pageHead(parts), filtersRow(parts)),
    ),
    dynamicChild(
      derive(() => githubState(parts.auth.get())),
      state => {
        if (state === 'checking') return kit.loadingState({ text: 'Checking GitHub…' })
        if (state === 'signed-out') return signedOutNotice(parts)
        return div({ class: 'flex min-h-0 flex-1' }, listColumn(parts, hasDetail), detailColumn(parts))
      },
    ),
  )
}
