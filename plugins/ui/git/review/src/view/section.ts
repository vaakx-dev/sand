import type { ReviewFile } from '@sand/pull-review/contract'
import { div, effect, intersectionObserver, show, sig, SPACE, untrack, type Sig } from '@vaakx-dev/vrui'
import type { CodeTab } from '../model/state'
import { fileBody } from './body'
import { scrollParent } from './scroll'
import { fileTags, viewedToggle } from './viewed'

const preload = '800px 0px'

export const fileSection = (tab: CodeTab, file: Sig<ReviewFile>) => {
  const { patches, ctx } = tab
  const path = file.get().path
  const open = sig(file.get().viewed !== 'viewed')
  let near = false

  effect(() => {
    const showing = open.get()
    untrack(() => patches.seen(path, near && showing))
  })

  return div(
    {
      class: 'border-b border-neutral-800',
      style: { scrollMarginTop: SPACE['12'] },
      onMount: element => {
        intersectionObserver(
          element,
          entries => {
            near = entries.some(entry => entry.isIntersecting)
            patches.seen(path, near && open.get())
          },
          { root: scrollParent(element), rootMargin: preload },
        )
      },
    },
    ctx.diff.head(() => file.get(), { open, tags: fileTags(tab, file), actions: viewedToggle(tab, file, open) }),
    show(open, () => fileBody(tab, file)),
  )
}
