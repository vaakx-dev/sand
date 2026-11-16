import { exactTime } from '@sand/util'
import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span } from '@vaakx-dev/vrui'
import { lastChecked } from '../data/pool'
import type { UsageModel } from '../model'
import { agoText } from '../format'
import { offlineNotes } from './notices'

const refreshButton = ({ delayed, icon, iconButton, spinner }: Kit, model: UsageModel) => {
  const working = derive(() => model.busy.get() || model.checking.get())
  const label = 'Check limits and reload usage'
  return iconButton(
    { 'aria-label': label, title: label, disabled: working, onClick: model.reload },
    dynamicChild(delayed(working), waiting => (waiting ? spinner('md') : icon('reload', 'md'))),
  )
}

const checkedText = ({ metaLine }: Kit, model: UsageModel) => {
  const updated = derive(() => lastChecked(model.plans.get()))
  return span(
    { class: 'shrink-0 tabular-nums', title: () => (updated.get() ? exactTime(updated.get()) : '') },
    metaLine(() => {
      model.now.get()
      return updated.get() ? `Checked ${agoText(updated.get())}` : ''
    }),
  )
}

export const toolbar = (kit: Kit, model: UsageModel) =>
  div(
    { class: 'flex min-w-0 items-center gap-2' },
    div(
      { class: 'flex min-w-0 flex-1 flex-col items-end text-right' },
      dynamicChild(model.notices, notices => div({ class: 'contents' }, offlineNotes(kit, notices, model.now))),
      checkedText(kit, model),
    ),
    refreshButton(kit, model),
  )
