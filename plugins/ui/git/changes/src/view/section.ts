import type { DiffFile } from '@sand/git-diff/contract'
import { div, effect, intersectionObserver, show, sig, SPACE, untrack, type Sig } from '@vaakx-dev/vrui'
import { fileBody } from './body'
import { openFileButton } from './open-file'
import type { ViewParts } from './parts'

const openLimit = 20

const preload = '800px 0px'

export const fileSection = (parts: ViewParts, file: Sig<DiffFile>, index: number) => {
  const { patches } = parts.model
  const path = file.get().path
  const open = sig(index < openLimit)
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
        const root = element.closest('[data-changes-scroll]')
        intersectionObserver(
          element,
          entries => {
            near = entries.some(entry => entry.isIntersecting)
            patches.seen(path, near && open.get())
          },
          { root, rootMargin: preload },
        )
        return parts.sections.add(path, { element, open })
      },
    },
    parts.diff.head(() => file.get(), { open, actions: openFileButton(parts, file) }),
    show(open, () => fileBody(parts, file, state, () => patches.retry(path))),
  )
}
