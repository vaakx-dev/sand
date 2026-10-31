import type { PullChecks, PullSummary } from '@sand/github/contract'
import type { IconName, Kit, Tone } from '@sand/ui-kit/contract'
import { duration, plural } from '@sand/util'
import { type Child, div, show, type Sig, sig, span } from '@vaakx-dev/vrui'
import { panelLine } from './line'

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

const summaryText = (checks: PullChecks) => {
  const found = [
    checks.failed ? `${checks.failed} failing` : '',
    checks.pending ? `${checks.pending} running` : '',
    checks.passed ? `${plural(checks.passed, 'check')} passed` : '',
  ].filter(Boolean)
  return checks.state === 'none' ? '' : found.join(' · ')
}

const summaryState = (checks: PullChecks): CheckState => {
  if (checks.failed) return 'fail'
  return checks.pending ? 'pending' : 'pass'
}

const stateMark = (kit: Kit, look: CheckLook) => span({ class: ['inline-flex', kit.toneText[look.tone]] }, kit.icon(look.icon, 14))

const toggle = (kit: Kit, open: Sig<boolean>) =>
  kit.quietButton(
    { size: 'sm', class: 'ml-auto', 'aria-expanded': () => String(open.get()), onClick: open.toggle() },
    () => (open.get() ? 'Hide' : 'Show'),
    kit.chevron(() => open.get()),
  )

const summaryLine = (kit: Kit, checks: PullChecks, more: Child) => {
  const text = summaryText(checks)
  if (!text) return kit.statusLine({ mark: kit.icon('check', 14), text: 'No checks', title: 'This pull request has no checks' })
  return kit.statusLine({ mark: stateMark(kit, looks[summaryState(checks)]), text, title: `Checks: ${text}` }, more)
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

const runRows = (kit: Kit, runs: CheckRun[]) => div({ class: 'flex flex-col gap-1 pl-6' }, ...runs.map(run => panelLine(runRow(kit, run))))

export const checksList = (kit: Kit, summary: PullSummary) => {
  const open = sig(false)
  const runs = byState(summary.checkList)
  const failing = runs.filter(run => run.state === 'fail')
  const rest = runs.filter(run => run.state !== 'fail')
  return div(
    { class: 'flex flex-col gap-1' },
    panelLine(summaryLine(kit, summary.checks, rest.length > 0 ? toggle(kit, open) : null)),
    failing.length > 0 ? runRows(kit, failing) : null,
    show(open, () => runRows(kit, rest)),
  )
}
