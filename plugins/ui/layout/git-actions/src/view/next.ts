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

const segment = 'inline-flex h-6 shrink-0 items-center text-xs font-medium whitespace-nowrap transition-colors'

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
  const tone = () => (idle.get() ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700' : 'bg-accent-500 text-white hover:bg-accent-600')
  const edge = () => (idle.get() ? 'border-neutral-700' : 'border-accent-600')
  const run = () => {
    const text = textOf(step.get(), model)
    if (text) void sendMessage(ctx, text)
  }
  return dropdown({
    placement: 'below-right',
    class: 'shrink-0',
    menuClass: 'w-64',
    trigger: (toggle, open) =>
      div(
        { class: 'flex overflow-hidden rounded-md' },
        button(
          {
            type: 'button',
            class: [focusable, segment, 'gap-1 px-2', tone],
            disabled: idle,
            title: step.map(value => (value === 'none' ? 'Nothing to do' : `Send "${textOf(value, model)}"`)),
            'aria-label': step.map(value => labels[value]),
            onClick: run,
          },
          span({ class: 'inline-flex md:hidden' }, dynamicChild(step, value => icon(glyphs[value], 14))),
          span({ class: 'hidden md:inline' }, step.map(value => labels[value])),
        ),
        button(
          {
            type: 'button',
            class: [focusable, segment, 'border-l px-1', tone, edge],
            title: 'More git actions',
            'aria-label': 'More git actions',
            'aria-expanded': open,
            onClick: toggle,
          },
          icon('down', 14),
        ),
      ),
    items: close => gitMenu(ctx, model, close),
  })
}
