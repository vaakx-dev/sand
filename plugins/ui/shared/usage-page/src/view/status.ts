import { exactTime } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, span } from '@vaakx-dev/vrui'
import { agoText } from '../format'
import type { UsageModel } from '../model'
import { offlineNotices } from './notices'

const checkedText = (model: UsageModel) => {
  const updated = derive(() => Math.max(0, ...(model.usage.get()?.accounts ?? []).map(account => account.limits?.updated ?? 0)))
  return span({ class: 'ml-auto shrink-0 tabular-nums', title: () => (updated.get() ? exactTime(updated.get()) : '') }, () => {
    model.now.get()
    return updated.get() ? `Checked ${agoText(updated.get())}` : ''
  })
}

export const statusLine = (kit: Kit, model: UsageModel) =>
  div(
    { class: 'flex items-start gap-3 text-xs text-neutral-500' },
    dynamicChild(model.notices, notices => div({ class: 'flex min-w-0 flex-1 flex-col gap-1' }, offlineNotices(kit, notices, model.now))),
    show(() => model.tab.get() === 'usage', () => checkedText(model)),
  )
