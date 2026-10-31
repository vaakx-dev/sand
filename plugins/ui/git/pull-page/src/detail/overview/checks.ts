import type { CheckItem, CheckItemState, PullChecks } from '@sand/github/contract'
import type { IconName, Tone } from '@sand/ui-kit/contract'
import { duration, plural } from '@sand/util'
import { div, dynamicChild, list, show, sig, span } from '@vaakx-dev/vrui'
import type { Shown } from '../shown'

interface CheckLook {
  tone: Tone
  icon: IconName
  label: string
}

const looks: Record<CheckItemState, CheckLook> = {
  fail: { tone: 'danger', icon: 'x', label: 'failing' },
  pending: { tone: 'warning', icon: 'clock', label: 'running' },
  pass: { tone: 'success', icon: 'check', label: 'passed' },
  skip: { tone: 'neutral', icon: 'working', label: 'skipped' },
}

const order: Record<CheckItemState, number> = { fail: 0, pending: 1, pass: 2, skip: 3 }

const summaryState = (checks: PullChecks): CheckItemState => {
  if (checks.failed) return 'fail'
  if (checks.pending) return 'pending'
  return 'pass'
}

const summaryText = (checks: PullChecks) => {
  if (checks.state === 'none') return 'No checks'
  const parts = [
    checks.failed ? `${checks.failed} failing` : '',
    checks.pending ? `${checks.pending} running` : '',
    checks.passed ? `${plural(checks.passed, 'check')} passed` : '',
  ].filter(Boolean)
  return parts.join(' · ') || 'No checks'
}

const mark = (shown: Shown, state: CheckItemState, size: 12 | 14 = 14) => {
  const { kit } = shown.parts
  const look = looks[state]
  return span({ class: ['inline-flex shrink-0', kit.toneText[look.tone]] }, kit.icon(look.icon, size))
}

const checkRow = (shown: Shown, item: () => CheckItem) => {
  const { kit } = shown.parts
  return kit.statusLine(
    {
      mark: dynamicChild(
        () => item().state,
        state => mark(shown, state, 12),
      ),
      text: () => item().name,
      title: () => `${item().name}: ${looks[item().state].label}`,
    },
    span({ class: 'ml-auto flex shrink-0 items-center gap-1' }, () => {
      const seconds = item().seconds
      return seconds === undefined ? '' : duration(seconds * 1000)
    }),
    show(
      () => Boolean(item().url),
      () => kit.iconButton({ size: 'sm', title: 'Open on GitHub', 'aria-label': 'Open on GitHub', onClick: () => kit.openTab(item().url ?? '') }, kit.icon('external', 12)),
    ),
  )
}

export const checksBlock = (shown: Shown) => {
  const { kit } = shown.parts
  const open = sig(false)
  const checks = () => shown.pull().checks
  const items = shown.model.detail.map(found => [...(found?.checkList ?? [])].sort((a, b) => order[a.state] - order[b.state]))
  return div(
    { class: 'flex flex-col gap-1' },
    div(
      { class: 'flex min-w-0 items-center gap-2 text-sm' },
      dynamicChild(
        () => summaryState(checks()),
        state => mark(shown, state),
      ),
      span({ class: 'min-w-0 flex-1 truncate' }, () => summaryText(checks())),
      show(
        () => shown.pull().checkList.length > 0,
        () => kit.linkButton({ class: 'text-xs', 'aria-expanded': () => String(open.get()), onClick: open.toggle() }, () => (open.get() ? 'Hide' : 'Show')),
      ),
    ),
    show(open, () =>
      list(
        items,
        item => item.name,
        item => checkRow(shown, () => item.get()),
        div({ class: 'flex flex-col gap-1 pl-6' }),
      ),
    ),
  )
}
