import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { forecastsOf, type History } from '../../data/forecast'
import type { Account } from '../../data/types'
import { listText } from '../../names'
import { card, muted, stats } from '../parts'
import { limitBar } from './bar'
import { forecastPanel, forecastSummary, type Forecasts } from './forecast'

export interface CardProps {
  kit: Kit
  now: Sig<number>
  nameOf(id: string): string
  colorOf(provider: string): string
  history: Sig<History | undefined>
  opened: Sig<Map<string, boolean>>
  windows: Sig<Map<string, string>>
  setOpen(account: string, open: boolean): void
  setWindow(account: string, window: string): void
}

const metaOf = (account: Account, nameOf: (id: string) => string) => {
  const others = account.machines.filter(id => id !== account.pc).map(nameOf)
  return [
    account.plan ? `${account.plan} plan` : 'subscription',
    `on ${account.pcName ?? 'this PC'}`,
    others.length ? `used on ${listText(others)}` : '',
    account.limits?.windows.length ? '' : 'no limits reported',
  ]
    .filter(Boolean)
    .join(' · ')
}

const runsOut = (forecasts: Forecasts) => [...forecasts.values()].some(forecast => forecast?.outAt !== undefined)

export const limitCard = (account: Account, props: CardProps) => {
  const { kit } = props
  const { chevron, quietButton } = kit
  const windows = account.limits?.windows ?? []
  const color = props.colorOf(account.provider)
  const forecasts = derive(() => {
    const history = props.history.get()
    return history && forecastsOf(account, history, Date.now())
  })
  const open = derive(() => props.opened.get().get(account.key) ?? runsOut(forecasts.get() ?? new Map()))
  const toggle = windows.some(window => window.resetsAt)
    ? quietButton(
        { size: 'sm', class: 'ml-auto', 'aria-expanded': () => String(open.get()), onClick: () => props.setOpen(account.key, !open.get()) },
        'Forecast',
        chevron(() => open.get()),
      )
    : null
  const detail = derive(() => ({ isOpen: open.get(), found: forecasts.get(), chosen: props.windows.get().get(account.key) }))
  const detailView = ({ isOpen, found, chosen }: { isOpen: boolean; found?: Forecasts; chosen?: string }) => {
    if (!found) return isOpen ? muted('Loading forecast…') : null
    if (!isOpen) return forecastSummary(windows, found)
    return forecastPanel(kit, { windows, forecasts: found, chosen, choose: window => props.setWindow(account.key, window), color })
  }
  return card(
    kit,
    account.label,
    metaOf(account, props.nameOf),
    windows.length ? stats(windows.map(window => limitBar(kit, window, color, props.now)), toggle) : null,
    windows.length ? dynamicChild(detail, detailView) : null,
  )
}
