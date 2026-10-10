import { derive, div, dynamicChild, icon, show, span } from '@sand/dom'
import type { ActionContext } from '../actions/send'
import type { Model } from '../model'
import { nextButton } from './next'
import { prPill } from './pill'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

const branchView = (model: Model) => {
  const branch = model.status.map(git => git?.branch ?? '')
  const worktree = model.status.map(git => Boolean(git?.worktree))
  return show(
    derive(() => !model.worktrees.get()),
    () =>
      span(
        { class: 'inline-flex min-w-0 items-center gap-1 px-1', title: () => `${worktree.get() ? 'Worktree on branch' : 'Branch'} ${branch.get()}` },
        dynamicChild(worktree, value => icon(value ? 'folder-git' : 'branch', 12)),
        span({ class: 'min-w-0 truncate py-1 text-middle' }, branch),
      ),
  )
}

const count = (value: () => number, mark: string, word: string) =>
  show(
    derive(() => value() > 0),
    () => span({ class: 'text-middle', title: () => plural(value(), word) }, () => `${mark}${value()}`),
  )

const syncView = (model: Model) => {
  const git = () => model.status.get()
  return span(
    { class: 'inline-flex shrink-0 items-center gap-2 px-1 tabular-nums' },
    count(() => git()?.changed ?? 0, '●', 'changed file'),
    count(() => git()?.ahead ?? 0, '↑', 'commit to push'),
    count(() => git()?.behind ?? 0, '↓', 'commit to pull'),
  )
}

export const gitWidget = (ctx: ActionContext, model: Model) =>
  show(model.status.map(Boolean), () =>
    div({ class: 'flex min-w-0 items-center gap-1' }, branchView(model), syncView(model), prPill(ctx, model), nextButton(ctx, model)),
  )
