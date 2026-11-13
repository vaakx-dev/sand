import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span, type Sig } from '@vaakx-dev/vrui'
import { forecastsOf, type History } from '../../data/forecast'
import { accountName, type Plan, plansOf, type WindowRow } from '../../data/plans'
import type { Account } from '../../data/types'
import type { Segment } from './bar'
import { windowRow } from './row'

export interface PlansProps {
  kit: Kit
  now: Sig<number>
  history: Sig<History | undefined>
}

type Forecasts = (account: Account) => ReturnType<typeof forecastsOf> | undefined

const accountLine = (account: Account) =>
  span({ class: 'flex min-w-0 items-center gap-1.5 text-xs' }, span({ class: 'truncate text-neutral-200' }, accountName(account)), span({ class: 'text-neutral-500' }, account.plan ?? 'Subscription'))

const singleLine = ({ metaLine }: Kit, account: Account) => metaLine(`${account.plan ?? 'Subscription'} · ${accountName(account)}`)

const planHead = (kit: Kit, plan: Plan) => {
  const [only] = plan.accounts
  return div(
    { class: 'flex flex-wrap items-center gap-x-4 gap-y-1' },
    span({ class: 'flex items-center gap-2' }, kit.modelLogo(plan.provider, 16), kit.rowName(plan.label)),
    plan.accounts.length === 1 && only ? singleLine(kit, only) : plan.accounts.map(accountLine),
  )
}

const segmentsOf = (row: WindowRow, forecasts: Forecasts): Segment[] =>
  row.shares.map(share => {
    const forecast = forecasts(share.account)?.get(share.window.id)
    return { ...share, ...(forecast && { forecast }) }
  })

const planBlock = (kit: Kit, plan: Plan, forecasts: Forecasts, now: number) =>
  div(
    { class: 'flex flex-col gap-2' },
    planHead(kit, plan),
    div(
      { class: 'flex flex-col rounded-lg border border-neutral-700' },
      plan.rows.map((row, index) => windowRow(row.label, segmentsOf(row, forecasts), now, index === 0)),
    ),
  )

export const plansSection = (accounts: Account[], { kit, now, history }: PlansProps) => {
  const plans = plansOf(accounts)
  const body = () => {
    if (!plans.length) return kit.emptyState({ text: 'No plan limits reported.' })
    const state = derive(() => ({ found: history.get(), at: now.get() }))
    return dynamicChild(state, ({ found, at }) => {
      const forecasts: Forecasts = account => (found ? forecastsOf(account, found, at) : undefined)
      return div({ class: 'flex flex-col gap-6' }, plans.map(plan => planBlock(kit, plan, forecasts, at)))
    })
  }
  return kit.pageSection({ title: 'Plans' }, body())
}
