import type { LimitWindow, Limits } from '@sand/protocol'
import { ago, badge, delayed, derive, div, dynamicChild, exactTime, icon, iconButton, settingsRow, settingsSection, span, spinner, sig, show, type Sig } from '@sand/dom'
import { coarseDuration, leftOf, percent } from '@sand/kit'
import { cssPercent } from './scale'

const checkedAt = (at: number) => (ago(at) === 'now' ? 'just now' : `${ago(at)} ago`)

const tone = (left: number) => (left < 0.1 ? 'danger' : left < 0.25 ? 'warning' : 'accent')

const tracks = { accent: 'bg-accent-950', warning: 'bg-warning-950', danger: 'bg-danger-950' }
const fills = { accent: 'bg-accent-400', warning: 'bg-warning-400', danger: 'bg-danger-400' }

const statusBadge = (status?: string) => {
  if (!status || status === 'allowed') return null
  if (status === 'rejected') return badge('danger', 'Limit reached')
  return badge('warning', status === 'allowed_warning' ? 'Near limit' : status.replaceAll('_', ' '))
}

const windowRow = (window: LimitWindow, now: Sig<number>) => {
  const left = leftOf(window)
  const level = tone(left)
  const reset = window.resetsAt
  return div(
    { class: 'flex flex-col gap-2 bg-neutral-900 px-4 py-3' },
    div(
      { class: 'flex flex-wrap items-baseline gap-x-3 gap-y-1' },
      span({ class: 'text-sm text-neutral-100' }, window.label),
      statusBadge(window.status),
      span({ class: 'ml-auto text-sm text-neutral-100 tabular-nums' }, `${percent(left)} left`),
      reset ? span({ class: 'text-xs text-neutral-400 tabular-nums', title: `Resets ${exactTime(reset)}` }, () => `resets in ${coarseDuration(reset - now.get())}`) : null,
    ),
    div(
      {
        class: ['h-2 w-full overflow-hidden rounded-full', tracks[level]],
        role: 'meter',
        'aria-label': window.label,
        'aria-valuenow': Math.round(left * 100),
        'aria-valuemin': 0,
        'aria-valuemax': 100,
      },
      div({ class: ['h-full rounded-full', fills[level]], style: { width: cssPercent(left) } }),
    ),
  )
}

export const limitsView = (read: () => Limits | undefined, now: Sig<number>, refresh?: () => Promise<void>) => {
  const checking = sig(false)
  const check = () => {
    if (!refresh || checking.get()) return
    checking.set(true)
    void refresh().finally(() => checking.set(false))
  }
  const limits = derive(read)
  const waiting = delayed(checking)
  return settingsSection(
    {
      title: 'Limits',
      action: div(
        { class: 'flex items-center gap-2' },
        span({ class: 'text-xs text-neutral-500 tabular-nums', title: () => (limits.get()?.windows.length ? `Checked ${exactTime(limits.get()!.updated)}` : '') }, () => {
          const current = limits.get()
          return current?.windows.length ? (now.get(), checkedAt(current.updated)) : ''
        }),
        refresh
          ? iconButton(
              { size: 'sm', title: 'Check limits', onClick: check, disabled: checking },
              show(waiting, () => spinner()),
              show(waiting.map(shown => !shown), () => icon('retry', 13)),
            )
          : null,
      ),
    },
    dynamicChild(limits, current =>
      current?.windows.length ? div({ class: 'contents' }, current.windows.map(window => windowRow(window, now))) : settingsRow('Not reported'),
    ),
  )
}
