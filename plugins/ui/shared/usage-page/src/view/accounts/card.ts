import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, show, type Sig } from '@vaakx-dev/vrui'
import { forecastsOf, type History } from '../../data/forecast'
import type { Account } from '../../data/types'
import { listText } from '../../names'
import { limitBars } from './bar'
import { forecastPanel, forecastSummary } from './forecast'

export interface CardProps {
  kit: Kit
  now: Sig<number>
  nameOf(id: string): string
  colorOf(provider: string): string
  history: Sig<History | undefined>
  windows: Sig<Map<string, string>>
  openOf(account: string): Sig<boolean>
  setWindow(account: string, window: string): void
}

const metaOf = (account: Account, nameOf: (id: string) => string) => {
  const others = account.machines.filter(id => id !== account.pc).map(nameOf)
  return [
    account.plan ? `${account.plan} plan` : 'Subscription',
    `on ${account.pcName ?? 'this PC'}`,
    others.length ? `used on ${listText(others)}` : '',
    account.limits?.windows.length ? '' : 'no limits reported',
  ]
    .filter(Boolean)
    .join(' · ')
}

export const limitCard = (account: Account, props: CardProps) => {
  const { kit } = props
  const { expandRow, expandToggle, loadingState, rowDetail, settingsRow } = kit
  const windows = account.limits?.windows ?? []
  const color = props.colorOf(account.provider)
  const open = props.openOf(account.key)
  const canForecast = windows.some(window => window.resetsAt)
  const forecasts = derive(() => {
    const history = props.history.get()
    return history && forecastsOf(account, history, Date.now())
  })
  const summary = derive(() => (open.get() ? undefined : forecasts.get()))
  const panel = derive(() => ({ found: forecasts.get(), chosen: props.windows.get().get(account.key) }))
  return expandRow(
    {},
    settingsRow({ title: account.label, detail: metaOf(account, props.nameOf) }, canForecast ? expandToggle(open, 'Forecast') : null),
    windows.length
      ? rowDetail(
          limitBars(kit, windows, color, props.now),
          dynamicChild(summary, found => (found ? forecastSummary(windows, found) : null)),
        )
      : null,
    canForecast
      ? show(open, () =>
          dynamicChild(panel, ({ found, chosen }) =>
            found
              ? rowDetail(forecastPanel(kit, { windows, forecasts: found, chosen, choose: window => props.setWindow(account.key, window), color }))
              : loadingState({ surface: 'group' }),
          ),
        )
      : null,
  )
}
