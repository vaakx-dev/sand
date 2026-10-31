import type { PullChecks, PullSummary } from '@sand/github/contract'
import type { IconName, Kit, Tone } from '@sand/ui-kit/contract'
import { duration } from '@sand/util'
import { div, span } from '@vaakx-dev/vrui'

type CheckRun = PullSummary['checkList'][number]
type CheckState = CheckRun['state']

interface CheckLook {
  tone: Tone
  icon: IconName
  label: string
}

const looks: Record<CheckState, CheckLook> = {
  fail: { tone: 'danger', icon: 'x', label: 'failed' },
  pending: { tone: 'warning', icon: 'clock', label: 'running' },
  pass: { tone: 'success', icon: 'check', label: 'passed' },
  skip: { tone: 'neutral', icon: 'working', label: 'skipped' },
}

const order: Record<CheckState, number> = { fail: 0, pending: 1, pass: 2, skip: 3 }

const counts = (checks: PullChecks) =>
  [
    { state: 'fail' as const, count: checks.failed },
    { state: 'pending' as const, count: checks.pending },
    { state: 'pass' as const, count: checks.passed },
  ].filter(item => item.count > 0)

const stateMark = (kit: Kit, look: CheckLook) => span({ class: ['inline-flex', kit.toneText[look.tone]] }, kit.icon(look.icon, 14))

const summaryLine = (kit: Kit, checks: PullChecks) => {
  const found = counts(checks)
  const first = found[0]
  if (checks.state === 'none' || !first) return kit.statusLine({ mark: kit.icon('check', 14), text: 'No checks', title: 'This pull request has no checks' })
  const text = found.map(item => `${item.count} ${looks[item.state].label}`).join(' · ')
  return kit.statusLine({ mark: stateMark(kit, looks[first.state]), text, title: `Checks: ${text}` })
}

const runTools = (kit: Kit, run: CheckRun) => {
  const { url } = run
  return span(
    { class: 'ml-auto flex shrink-0 items-center gap-1' },
    run.seconds === undefined ? null : span({ class: 'tabular-nums' }, duration(run.seconds * 1000)),
    url
      ? kit.iconButton({ size: 'sm', title: `Open ${run.name} on GitHub`, 'aria-label': `Open ${run.name} on GitHub`, onClick: () => kit.openTab(url) }, kit.icon('external', 14))
      : null,
  )
}

const runRow = (kit: Kit, run: CheckRun) => {
  const look = looks[run.state]
  return kit.statusLine({ mark: stateMark(kit, look), text: run.name, title: `${run.name}: ${look.label}` }, runTools(kit, run))
}

const byState = (runs: CheckRun[]) => [...runs].sort((a, b) => order[a.state] - order[b.state])

export const checksList = (kit: Kit, summary: PullSummary) =>
  div({ class: 'flex flex-col gap-1' }, summaryLine(kit, summary.checks), ...byState(summary.checkList).map(run => runRow(kit, run)))
