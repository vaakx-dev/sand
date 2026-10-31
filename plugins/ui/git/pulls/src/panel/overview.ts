import { pullFactsLine } from '@sand/github/facts'
import { pullName } from '@sand/github/look'
import { div, span } from '@vaakx-dev/vrui'
import { pullUrl, type Shown } from './shown'

const moreMenu = (shown: Shown) => {
  const { parts, link, at, state } = shown
  const { kit } = parts
  return kit.dropdown({
    placement: 'below-right',
    trigger: (press, open) => kit.iconButton({ ...press, size: 'sm', active: open, title: 'More actions', 'aria-label': 'More actions' }, kit.icon('more', 14)),
    items: close => [
      kit.menuItem(
        {
          icon: 'x',
          tone: 'danger',
          disabled: state.busy,
          title: 'Remove this pull request from the thread',
          onClick: () => {
            close()
            void state.run(() => parts.actions.unlink(link, at))
          },
        },
        'Unlink from this thread',
      ),
    ],
  })
}

const topLine = (shown: Shown) => {
  const { parts, link, at, state } = shown
  const { kit } = parts
  return div(
    { class: 'flex min-w-0 items-center gap-1' },
    span({ class: 'flex min-w-0 flex-1' }, kit.metaLine(`${link.repo} · ${pullName(link)}`)),
    kit.iconButton(
      { size: 'sm', title: 'Refresh from GitHub', 'aria-label': 'Refresh from GitHub', disabled: state.busy, onClick: () => void state.run(() => parts.actions.refresh(link, at)) },
      kit.icon('reload', 14),
    ),
    kit.iconButton({ size: 'sm', title: 'Open on GitHub', 'aria-label': 'Open on GitHub', onClick: () => kit.openTab(pullUrl(shown)) }, kit.icon('external', 14)),
    moreMenu(shown),
  )
}

export const overview = (shown: Shown) => {
  const { kit } = shown.parts
  const { summary } = shown.link
  return div(
    { class: 'flex flex-col gap-2' },
    topLine(shown),
    summary ? div({ class: 'text-base font-medium wrap-anywhere' }, summary.title) : kit.loadingState({ text: 'Loading from GitHub…', flush: true }),
    summary ? pullFactsLine(kit, () => summary) : null,
  )
}
