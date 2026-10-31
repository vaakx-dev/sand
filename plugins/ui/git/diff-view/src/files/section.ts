import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild, effect, intersectionObserver, show, SPACE, untrack, type Sig } from '@vaakx-dev/vrui'
import type { DiffSectionFile, DiffSectionOptions, DiffView, PatchState } from '../contract'
import { inset } from '../view/inset'
import { scrollParent } from './scroll'

const preload = '800px 0px'

const sectionBody = <F extends DiffSectionFile>(kit: Kit, file: Sig<F>, state: Sig<PatchState>, options: DiffSectionOptions<F>) =>
  dynamicChild(state, now => {
    if (file.get().binary) return inset(kit.emptyState({ text: 'Binary file' }))
    if (now.kind === 'ready') return options.body(now.patch)
    if (now.kind === 'error') return inset(kit.errorState({ text: `Couldn't load this diff: ${now.message}`, retry: () => options.patches.retry(file.get().path) }))
    return inset(kit.loadingState())
  })

export const fileSection = <F extends DiffSectionFile>(kit: Kit, head: DiffView['head'], file: Sig<F>, options: DiffSectionOptions<F>) => {
  const { patches, open } = options
  const path = file.get().path
  const state = patches.state(file.get())
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
        return options.onMount?.(element)
      },
    },
    head(() => file.get(), { open, tags: options.tags, actions: options.actions }),
    show(open, () => sectionBody(kit, file, state, options)),
  )
}
