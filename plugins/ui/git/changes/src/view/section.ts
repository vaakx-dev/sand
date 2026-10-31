import type { DiffFile } from '@sand/git-diff/contract'
import { div, effect, intersectionObserver, show, sig, SPACE, span, untrack, type Sig } from '@vaakx-dev/vrui'
import { fileBody } from './body'
import { kindMark, lineStat, pathLabel } from './marks'
import { openFileButton } from './open-file'
import type { ViewParts } from './parts'

const openLimit = 20

const preload = '800px 0px'

const sectionHead = (parts: ViewParts, file: Sig<DiffFile>, open: Sig<boolean>) => {
  const { kit } = parts
  return div(
    { class: [kit.layer.sticky, 'sticky top-12 flex h-10 items-center gap-2 border-b border-neutral-800 bg-neutral-950 pr-3 pl-1 text-sm'] },
    kit.iconButton(
      { size: 'sm', title: () => (open.get() ? 'Collapse' : 'Expand'), 'aria-expanded': () => String(open.get()), onClick: open.toggle() },
      kit.chevron(() => open.get()),
    ),
    kindMark(() => file.get().kind),
    show(
      () => Boolean(file.get().from),
      () => span({ class: 'flex min-w-0 shrink items-center gap-1' }, pathLabel(() => file.get().from ?? ''), span({ class: 'shrink-0 text-neutral-500' }, '→')),
    ),
    pathLabel(() => file.get().path),
    span({ class: 'flex-1' }),
    lineStat(
      () => file.get().add,
      () => file.get().del,
    ),
    openFileButton(parts, file),
  )
}

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
    sectionHead(parts, file, open),
    show(open, () => fileBody(parts, file, state, () => patches.retry(path))),
  )
}
