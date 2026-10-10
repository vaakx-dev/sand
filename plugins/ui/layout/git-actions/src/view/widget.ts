import { derive, div, dynamicChild, icon, show, span } from '@sand/dom'
import type { ActionContext } from '../actions/send'
import type { Model } from '../model'
import { nextButton } from './next'
import { prPill } from './pill'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const branchView = (model: Model) => {
  const branch = model.status.map(git => git?.branch ?? '')
  const worktree = model.status.map(git => Boolean(git?.worktree))
  return span(
    {
      class: 'hidden max-w-48 min-w-0 shrink items-center gap-1 text-xs text-neutral-500 md:inline-flex',
      title: () => `${worktree.get() ? 'Worktree on branch' : 'Branch'} ${branch.get()}`,
    },
    dynamicChild(worktree, value => icon(value ? 'folder-git' : 'branch', 13)),
    span({ class: 'truncate' }, branch),
  )
}

const count = (value: () => number, mark: string, word: string) =>
  show(
    derive(() => value() > 0),
    () => span({ title: () => plural(value(), word) }, () => `${mark}${value()}`),
  )

const syncView = (model: Model) => {
  const git = () => model.status.get()
  return span(
    { class: 'hidden shrink-0 items-center gap-2 text-xs tabular-nums text-neutral-500 md:inline-flex' },
    count(() => git()?.changed ?? 0, '●', 'changed file'),
    count(() => git()?.ahead ?? 0, '↑', 'commit to push'),
    count(() => git()?.behind ?? 0, '↓', 'commit to pull'),
  )
}

export const gitWidget = (ctx: ActionContext, model: Model) =>
  show(model.status.map(Boolean), () =>
    div({ class: 'flex min-w-0 items-center gap-2' }, branchView(model), syncView(model), prPill(ctx, model), nextButton(ctx, model)),
  )
