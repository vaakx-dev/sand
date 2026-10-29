import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import { forecastsOf, type History } from '../../data/forecast'
import type { Account } from '../../data/types'
import { listText } from '../../names'
import { limitBars } from './bar'
import { forecastPanel } from './forecast'

export interface CardProps {
  kit: Kit
  now: Sig<number>
  nameOf(id: string): string
  colorOf(provider: string): string
  history: Sig<History | undefined>
  windows: Sig<Map<string, string>>
  setWindow(account: string, window: string): void
}

const metaOf = (account: Account, nameOf: (id: string) => string) => {
  const others = account.machines.filter(id => id !== account.pc).map(nameOf)
  return [
    account.plan ?? 'Subscription',
    account.pcName ?? 'This PC',
    others.length ? `used on ${listText(others)}` : '',
    account.limits?.windows.length ? '' : 'no limits reported',
  ]
    .filter(Boolean)
    .join(' · ')
}

export const limitCard = (account: Account, props: CardProps) => {
  const { kit } = props
  const { expandRow, loadingState, providerIcon, rowDetail, settingsRow } = kit
  const windows = account.limits?.windows ?? []
  const color = props.colorOf(account.provider)
  const canForecast = windows.some(window => window.resetsAt)
  const forecasts = derive(() => {
    const history = props.history.get()
    return history && forecastsOf(account, history, Date.now())
  })
  const panel = derive(() => ({ found: forecasts.get(), chosen: props.windows.get().get(account.key) }))
  return expandRow(
    {},
    settingsRow({ lead: providerIcon(account.provider, 16), title: account.label, detail: metaOf(account, props.nameOf) }),
    windows.length ? rowDetail(dynamicChild(forecasts, found => limitBars(kit, windows, color, props.now, found))) : null,
    canForecast
      ? dynamicChild(panel, ({ found, chosen }) =>
          found
            ? rowDetail(forecastPanel(kit, { windows, forecasts: found, chosen, choose: window => props.setWindow(account.key, window), color }))
            : loadingState({ surface: 'group' }),
        )
      : null,
  )
}
