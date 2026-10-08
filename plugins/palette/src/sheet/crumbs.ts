import { div, icon, quietButton, span } from '@sand/dom'
import type { PageNav } from './nav'

const crumb = (title: string, far: boolean, back: () => void) =>
  span({ class: ['items-center gap-1', far ? 'hidden sm:inline-flex' : 'inline-flex'] }, quietButton({ size: 'sm', onClick: back }, title), icon('right', 12))

export const crumbs = (nav: PageNav) => {
  const trail = nav.trail()
  const last = trail.length - 1
  if (last < 1) return null
  return div(
    { class: 'flex shrink-0 flex-wrap items-center gap-1 px-4 pt-3 text-xs text-neutral-500' },
    trail.map((page, index) =>
      index === last ? span({ class: 'px-2 text-neutral-200' }, page.title) : crumb(page.title, index < last - 1, () => nav.back(index)),
    ),
  )
}
