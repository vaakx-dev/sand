import { plural } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, list, show, sig, span, type Derive, type Sig } from '@vaakx-dev/vrui'
import type { Gauge } from '../../data/gauges'
import type { Plan } from '../../data/pool'
import { type Tone, toneOf } from '../../look'
import { accountList } from './accounts'
import { whenText } from './pace'
import { framed, windowRow } from './row'

export interface PlansProps {
  gauges: Derive<Gauge[]>
  now: Sig<number>
}

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

const planHead = (kit: Kit, plan: Sig<Plan>, open: Sig<boolean>) =>
  div(
    { class: 'flex flex-wrap items-center gap-x-4 gap-y-1' },
    span(
      { class: 'flex items-center gap-2' },
      dynamicChild(() => plan.get().provider, provider => kit.modelLogo(provider, 16)),
      kit.rowName(() => plan.get().label),
    ),
    dynamicChild(
      () => pooled(plan.get()),
      many => (many ? kit.expandToggle(open, () => placesOf(plan.get())) : kit.metaLine(() => soleLine(plan.get().accounts))),
    ),
  )

const gaugeRow = (gauge: Gauge, first: boolean) => {
  const tone = toneOf(gauge.state, gauge.forecast?.outAt)
  return windowRow({ label: gauge.window.label, state: gauge.state, tone, when: resetText(gauge, tone) }, first)
}

const planBlock = (kit: Kit, plan: Sig<Plan>, { gauges, now }: PlansProps) => {
  const open = sig(false)
  const rows = derive(() => gauges.get().filter(gauge => gauge.plan.kind === plan.get().kind))
  return div(
    { class: 'flex flex-col gap-2' },
    planHead(kit, plan, open),
    dynamicChild(rows, shown => framed(shown.map((gauge, index) => gaugeRow(gauge, index === 0)))),
    show(open, () => dynamicChild(derive(() => ({ shown: plan.get(), at: now.get() })), ({ shown, at }) => accountList(kit, shown, at))),
  )
}

export const plansSection = (kit: Kit, props: PlansProps) => {
  const plans = derive(() => [...new Set(props.gauges.get().map(gauge => gauge.plan))])
  return kit.pageSection(
    { title: 'Plans' },
    show(() => !plans.get().length, () => kit.emptyState({ text: 'No plan limits reported.' })),
    list(plans, plan => plan.kind, plan => planBlock(kit, plan, props), div({ class: 'flex flex-col gap-6' })),
  )
}
