import { button, dropdown, dynamicChild, focusable, icon, show, span } from '@sand/dom'
import type { ActionContext } from '../actions/send'
import type { Model } from '../model'
import { pillState, type PillTone } from '../state/pill'
import { prDetails } from './details'

const tones: Record<PillTone, string> = {
  running: 'bg-warning-950 text-warning-400 hover:bg-warning-900',
  failing: 'bg-danger-950 text-danger-400 hover:bg-danger-900',
  ready: 'bg-success-950 text-success-400 hover:bg-success-900',
  merged: 'bg-accent-950 text-accent-300 hover:bg-accent-900',
  quiet: 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700',
}

export const prPill = (ctx: ActionContext, model: Model) => {
  const pr = model.pr.map(value => value ?? undefined)
  const state = pr.map(value => (value ? pillState(value) : undefined))
  const tone = state.map(value => tones[value?.tone ?? 'quiet'])
  return show(pr.map(Boolean), () =>
    dropdown({
      placement: 'below-right',
      menuClass: 'w-80',
      trigger: (toggle, open) =>
        button(
          {
            type: 'button',
            class: [focusable, 'inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-xs whitespace-nowrap transition-colors', tone],
            title: pr.map(value => (value ? `#${value.number} ${value.title}` : '')),
            'aria-expanded': open,
            onClick: () => {
              if (!open.get()) model.refreshPr()
              toggle()
            },
          },
          icon('compare', 13),
          span(() => `#${pr.get()?.number ?? ''} · ${state.get()?.label ?? ''}`),
        ),
      items: close => [dynamicChild(pr, value => prDetails(ctx, value, close))],
    }),
  )
}
