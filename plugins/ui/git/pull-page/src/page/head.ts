import { div, keys, show } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'
import { pageColumn } from './column'
import { filterChips } from './filters'

const searchBox = ({ kit, query }: PageParts) =>
  kit.searchField({
    placeholder: 'Search, or author:me label:bug',
    'aria-label': 'Search pull requests',
    bindValue: query.q,
    onKeyDown: keys({ Escape: () => query.q.set('') }),
  })

export const pageHead = (parts: PageParts) => {
  const { kit, list, narrow } = parts
  return div(
    { class: 'flex flex-col' },
    kit.paneHead(
      { class: pageColumn(parts) },
      kit.headTitle(1, 'Pull requests'),
      show(
        () => !narrow.get(),
        () => div({ class: 'flex w-64 min-w-0 shrink' }, searchBox(parts)),
      ),
      show(narrow, () => div({ class: 'flex shrink-0 items-center gap-2' }, ...filterChips(parts))),
      kit.iconButton(
        { title: 'Refresh from GitHub', 'aria-label': 'Refresh from GitHub', disabled: () => list.phase.get() === 'loading', onClick: list.refresh },
        kit.icon('reload'),
      ),
    ),
    show(narrow, () => div({ class: ['flex px-4 pb-2', pageColumn(parts)] }, searchBox(parts))),
  )
}
