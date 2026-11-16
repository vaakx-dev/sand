import { percent } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { poolState } from '@sand/usage/contract'
import { div, span } from '@vaakx-dev/vrui'
import type { Plan, PlanWindow, PoolAccount } from '../../data/pool'
import { TONE_FILL, TONE_TEXT, toneOf } from '../../look'
import { whenText } from './pace'
import { framed } from './row'

const columns = (plan: Plan) => ({ gridTemplateColumns: `repeat(${plan.windows.length}, minmax(0, 1fr))` })

const detailOf = (account: PoolAccount) => [account.pcName, account.plan].filter(Boolean).join(' · ')

const cell = (account: PoolAccount, { id }: PlanWindow, now: number) => {
  const window = account.windows.find(found => found.id === id)
  if (!window) return span({ class: 'text-xs text-neutral-500' }, '—')
  const state = poolState([window], now)
  const tone = toneOf(state)
  const reset = window.resetsAt && window.resetsAt > now ? whenText(window.resetsAt) : 'not started'
  return div(
    { class: 'flex min-w-0 flex-col gap-1' },
    div(
      { class: 'h-1.5 overflow-hidden rounded-full bg-neutral-800' },
      div({ class: ['h-full rounded-full', TONE_FILL[tone]], style: { width: `${(tone === 'out' ? 1 : state.left) * 100}%` } }),
    ),
    span({ class: 'truncate text-xs text-neutral-500 tabular-nums' }, span({ class: TONE_TEXT[tone] }, tone === 'out' ? 'Out' : percent(state.left)), ` · ${reset}`),
  )
}

const accountRow = (plan: Plan, account: PoolAccount, now: number) =>
  div(
    { class: 'flex flex-col gap-2 border-t border-neutral-700 px-3 py-2 sm:flex-row sm:items-center sm:gap-3' },
    div({ class: 'flex min-w-0 flex-col sm:w-40 sm:shrink-0' }, span({ class: 'truncate text-sm text-neutral-200' }, account.label), span({ class: 'truncate text-xs text-neutral-500' }, detailOf(account))),
    div({ class: 'grid min-w-0 flex-1 gap-3', style: columns(plan) }, plan.windows.map(window => cell(account, window, now))),
  )

const header = ({ metaLine }: Kit, plan: Plan) =>
  div(
    { class: 'flex gap-3 px-3 py-2' },
    span({ class: 'hidden w-40 shrink-0 sm:block' }),
    div({ class: 'grid min-w-0 flex-1 gap-3', style: columns(plan) }, plan.windows.map(window => metaLine(window.label))),
  )

const byPlace = (first: PoolAccount, second: PoolAccount) => first.pcName.localeCompare(second.pcName) || first.label.localeCompare(second.label)

export const accountList = (kit: Kit, plan: Plan, now: number) =>
  framed(header(kit, plan), plan.accounts.toSorted(byPlace).map(account => accountRow(plan, account, now)))
