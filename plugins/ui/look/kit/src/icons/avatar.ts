import type { ProjectLook } from '@sand/project/contract'
import { circle, derive, dynamicChild, img, read, span, svg, textEl, type ReactiveValue } from '@vaakx-dev/vrui'
import { appIcon } from '../heads/app-icon'
import { duneHue, duneIcon } from './dunes'

const quickMark = (size: number) =>
  svg(
    { viewBox: '0 0 16 16', width: size, height: size, class: 'shrink-0 text-neutral-400' },
    circle({ cx: 8, cy: 8, r: 6.25, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, pathLength: 16, strokeDasharray: '1.25 0.75' }),
  )

const picture = (src: string, size: number) =>
  img({ src, alt: '', width: size, height: size, draggable: false, class: ['shrink-0', size > 32 ? 'rounded-xl' : 'rounded-sm'], style: { width: `${size}px`, height: `${size}px` } })

export const projectIcon = (name: string, look: ProjectLook = {}, size = 16) => {
  if (look.quick) return quickMark(size)
  if (look.app) return appIcon(size)
  return picture(look.file || duneIcon(name, look), size)
}

const initialOf = (name: string) => (Array.from(name.trim())[0] ?? '').toUpperCase()

export const projectMark = (name: string, look: ProjectLook = {}, size = 14) => {
  if (look.file || look.app || look.quick) return projectIcon(name, look, size)
  return span(
    {
      'aria-hidden': 'true',
      class: ['inline-flex shrink-0 font-bold text-black', size > 20 ? 'rounded-md' : 'rounded-sm'],
      style: { width: `${size}px`, height: `${size}px`, backgroundColor: `hsl(${duneHue(name, look)} 70% 70%)` },
    },
    svg(
      { viewBox: '0 0 14 14', width: size, height: size },
      textEl({ x: 7, y: 7, textAnchor: 'middle', dominantBaseline: 'central', fill: 'currentColor', fontSize: 9 }, initialOf(name)),
    ),
  )
}

export const projectAvatar = (name: ReactiveValue<string>, look: ReactiveValue<ProjectLook | undefined>, size = 16) =>
  dynamicChild(
    derive(() => JSON.stringify([read(name), read(look) ?? {}])),
    key => {
      const [current, found] = JSON.parse(key) as [string, ProjectLook]
      return projectIcon(current, found, size)
    },
  )
