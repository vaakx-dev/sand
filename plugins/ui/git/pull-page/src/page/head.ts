import { div, keys, show } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'
import { pageColumn } from './column'

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
      { led: narrow, class: pageColumn(parts) },
      show(narrow, () => kit.showSideButton(narrow, 'Show the sidebar', parts.showSide)),
      kit.headTitle(1, 'Pull requests'),
      show(
        () => !narrow.get(),
        () => div({ class: 'flex w-64 min-w-0 shrink' }, searchBox(parts)),
      ),
      kit.iconButton(
        { title: 'Refresh from GitHub', 'aria-label': 'Refresh from GitHub', disabled: () => list.phase.get() === 'loading', onClick: list.refresh },
        kit.icon('reload'),
      ),
      kit.closeButton({ title: 'Close pull requests', onClick: parts.close }),
    ),
    show(narrow, () => div({ class: ['flex px-4 pb-2', pageColumn(parts)] }, searchBox(parts))),
  )
}
