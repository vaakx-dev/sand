import { button, div, dropdown, dynamicChild, focusable, icon, span } from '@sand/dom'
import { messages } from '../actions/messages'
import { sendMessage, type ActionContext } from '../actions/send'
import type { Model } from '../model'
import { baseOf, type Step } from '../state/next'
import { gitMenu } from './menu'

const labels: Record<Step, string> = {
  commit: 'Commit',
  pull: 'Pull',
  push: 'Push',
  pr: 'Create PR',
  babysit: 'Babysit',
  merge: 'Merge',
  none: 'Up to date',
}

const glyphs: Record<Step, string> = {
  commit: 'check',
  pull: 'arrowDown',
  push: 'up',
  pr: 'compare',
  babysit: 'eye',
  merge: 'promote',
  none: 'check',
}

const segment = 'inline-flex h-6 shrink-0 items-center rounded-md text-xs whitespace-nowrap transition-colors hover:bg-neutral-800'

const textOf = (step: Step, model: Model) => {
  const base = baseOf(model.status.get(), model.pr.get())
  const texts: Record<Step, string | undefined> = {
    commit: messages.commit,
    pull: messages.pull,
    push: messages.push,
    pr: messages.pr,
    babysit: messages.babysit,
    merge: messages.merge(base),
    none: undefined,
  }
  return texts[step]
}

export const nextButton = (ctx: ActionContext, model: Model) => {
  const { step } = model
  const idle = step.map(value => value === 'none')
  const run = () => {
    const text = textOf(step.get(), model)
    if (text) void sendMessage(ctx, text)
  }
  return dropdown({
    placement: 'above-right',
    class: 'shrink-0',
    menuClass: 'w-64',
    trigger: (toggle, open) =>
      div(
        { class: 'flex items-center' },
        button(
          {
            type: 'button',
            class: [focusable, segment, 'gap-1 px-2 font-medium text-neutral-200'],
            hidden: idle,
            title: step.map(value => (value === 'none' ? 'Nothing to do' : `Send "${textOf(value, model)}"`)),
            'aria-label': step.map(value => labels[value]),
            onClick: run,
          },
          dynamicChild(step, value => icon(glyphs[value], 12)),
          span({ class: 'text-middle' }, step.map(value => labels[value])),
        ),
        button(
          {
            type: 'button',
            class: [focusable, segment, 'px-1', () => (open.get() ? 'bg-neutral-800 text-neutral-200' : 'text-neutral-500')],
            title: 'More git actions',
            'aria-label': 'More git actions',
            'aria-expanded': open,
            onClick: toggle,
          },
          icon('down', 12),
        ),
      ),
    items: close => gitMenu(ctx, model, close),
  })
}
