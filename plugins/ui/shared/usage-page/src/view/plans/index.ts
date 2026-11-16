import { grouped, plural } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { div, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import type { Gauge } from '../../data/gauges'
import type { Plan } from '../../data/pool'
import { type Tone, toneOf } from '../../look'
import { accountList } from './accounts'
import { whenText } from './pace'
import { framed, windowRow } from './row'

export type Opened = Map<string, Sig<boolean>>

const pooled = (plan: Plan) => plan.accounts.length > 1

const placesOf = (plan: Plan) => {
  const pcs = new Set(plan.accounts.map(account => account.pcName)).size
  return pcs > 1 ? `${plural(plan.accounts.length, 'account')} on ${pcs} PCs` : plural(plan.accounts.length, 'account')
}

const soleLine = ([only]: Plan['accounts']) => [only?.plan ?? 'Subscription', only?.pcName].filter(Boolean).join(' · ')

const resetText = ({ plan, resetAt }: Gauge, tone: Tone) => {
  if (!resetAt) return 'not started'
  if (tone === 'out') return `back ${whenText(resetAt)}`
  return pooled(plan) ? `next reset ${whenText(resetAt)}` : whenText(resetAt)
}

const planHead = (kit: Kit, plan: Plan, open: Sig<boolean>) =>
  div(
    { class: 'flex flex-wrap items-center gap-x-4 gap-y-1' },
    span({ class: 'flex items-center gap-2' }, kit.modelLogo(plan.provider, 16), kit.rowName(plan.label)),
    pooled(plan) ? kit.expandToggle(open, placesOf(plan)) : kit.metaLine(soleLine(plan.accounts)),
  )

const gaugeRow = (gauge: Gauge, first: boolean) => {
  const tone = toneOf(gauge.state, gauge.forecast?.outAt)
  return windowRow({ label: gauge.window.label, state: gauge.state, tone, when: resetText(gauge, tone) }, first)
}

const planBlock = (kit: Kit, plan: Plan, gauges: Gauge[], now: number, opened: Opened) => {
  const open = grouped(opened, plan.kind, () => sig(false))
  return div(
    { class: 'flex flex-col gap-2' },
    planHead(kit, plan, open),
    framed(gauges.map((gauge, index) => gaugeRow(gauge, index === 0))),
    show(open, () => accountList(kit, plan, now)),
  )
}

export const plansSection = (kit: Kit, gauges: Gauge[], now: number, opened: Opened) => {
  const plans = [...new Set(gauges.map(gauge => gauge.plan))]
  return kit.pageSection(
    { title: 'Plans' },
    plans.length
      ? div({ class: 'flex flex-col gap-6' }, plans.map(plan => planBlock(kit, plan, gauges.filter(gauge => gauge.plan === plan), now, opened)))
      : kit.emptyState({ text: 'No plan limits reported.' }),
  )
}
