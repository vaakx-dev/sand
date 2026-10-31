import { div, keys, show } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'
import { pageColumn } from './column'

export const pageHead = (parts: PageParts) => {
  const { kit, query, list, narrow } = parts
  return kit.paneHead(
    { led: narrow, class: pageColumn(parts) },
    show(narrow, () => kit.showSideButton(narrow, 'Show the sidebar', parts.showSide)),
    kit.headTitle(1, 'Pull requests'),
    div(
      { class: 'flex w-64 min-w-0 shrink' },
      kit.searchField({
        placeholder: 'Search, or author:me label:bug',
        'aria-label': 'Search pull requests',
        bindValue: query.q,
        onKeyDown: keys({ Escape: () => query.q.set('') }),
      }),
    ),
    kit.iconButton(
      { title: 'Refresh from GitHub', 'aria-label': 'Refresh from GitHub', disabled: () => list.phase.get() === 'loading', onClick: list.refresh },
      kit.icon('reload'),
    ),
    kit.closeButton({ title: 'Close pull requests', onClick: parts.close }),
  )
}
