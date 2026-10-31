import type { PullSummary } from '@sand/github/contract'
import { plural } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'
import { pullName, stateLook } from '../pull/look'
import { pullUrl, type Shown } from './shown'

const statLine = (summary: PullSummary) => `by ${summary.author} · ${plural(summary.files, 'file')} · +${summary.add} −${summary.del}`

const tools = (shown: Shown) => {
  const { parts, link, at, state } = shown
  const { kit } = parts
  return span(
    { class: 'ml-auto flex items-center gap-1' },
    kit.iconButton(
      { size: 'sm', title: 'Refresh from GitHub', 'aria-label': 'Refresh from GitHub', disabled: state.busy, onClick: () => void state.run(() => parts.actions.refresh(link, at)) },
      kit.icon('reload', 14),
    ),
    kit.iconButton({ size: 'sm', title: 'Open on GitHub', 'aria-label': 'Open on GitHub', onClick: () => kit.openTab(pullUrl(shown)) }, kit.icon('external', 14)),
  )
}

export const overview = (shown: Shown) => {
  const { kit } = shown.parts
  const { summary } = shown.link
  const look = stateLook(summary)
  return div(
    { class: 'flex flex-col gap-1' },
    div({ class: 'flex items-center gap-2' }, kit.badge(look.tone, kit.icon(look.icon, 14), look.label), span({ class: 'text-sm text-neutral-400' }, pullName(shown.link)), tools(shown)),
    summary ? div({ class: 'text-base font-medium wrap-anywhere' }, summary.title) : kit.loadingState({ text: 'Loading from GitHub…', flush: true }),
    summary ? kit.metaLine(span({ class: 'font-mono' }, `${summary.base} ← ${summary.head}`)) : null,
    summary ? kit.metaLine(statLine(summary)) : null,
  )
}
