import type { PullRef } from '@sand/github/contract'
import type { PullDetail } from '@sand/pull-detail/contract'
import { derive, div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { PageParts } from '../parts'
import { pullActions } from './actions'
import { detailHead } from './head'
import { detailModel, type DetailModel } from './model'
import type { Shown } from './shown'
import { detailTabs } from './tabs'

type Phase = 'loading' | 'failed' | 'ready'

const shownOf = (parts: PageParts, model: DetailModel): Shown => {
  const pull = (): PullDetail => {
    const found = model.detail.get()
    if (!found) throw new Error('The pull request is not loaded yet')
    return found
  }
  return {
    parts,
    model,
    actions: pullActions({ ctx: parts.ctx, select: parts.select }, model),
    pull,
    linked: derive(() => parts.agent.linked(model.ref)),
  }
}

const backRow = (parts: PageParts) =>
  show(parts.narrow, () =>
    div(
      { class: 'px-2 pt-2' },
      parts.kit.iconButton({ title: 'Back to the list', 'aria-label': 'Back to the list', onClick: () => parts.select(undefined) }, parts.kit.icon('back')),
    ),
  )

export const detailView = (parts: PageParts, ref: PullRef) => {
  const { kit } = parts
  const model = detailModel(parts.ctx, ref)
  const phase = derive((): Phase => (model.detail.get() ? 'ready' : model.failure.get() ? 'failed' : 'loading'))
  return div(
    { class: 'flex h-full min-h-0 min-w-0 flex-1 flex-col' },
    dynamicChild(phase, state => {
      if (state === 'ready') {
        const shown = shownOf(parts, model)
        return div({ class: 'flex min-h-0 flex-1 flex-col' }, detailHead(shown), ...detailTabs(shown))
      }
      if (state === 'failed')
        return div({ class: 'flex flex-col' }, backRow(parts), div({ class: 'p-4' }, kit.errorState({ text: () => model.failure.get(), retry: () => model.load() })))
      return div({ class: 'flex flex-col' }, backRow(parts), div({ class: 'p-4' }, kit.loadingState({ text: 'Loading the pull request…' })))
    }),
  )
}
