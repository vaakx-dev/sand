import type { ProjectLook } from '@sand/project/contract'
import { circle, derive, dynamicChild, img, read, svg, type ReactiveValue } from '@vaakx-dev/vrui'
import { appIcon } from '../heads/app-icon'
import { duneIcon } from './dunes'

const quickMark = (size: number) =>
  svg(
    { viewBox: '0 0 16 16', width: size, height: size, class: 'shrink-0 text-neutral-400' },
    circle({ cx: 8, cy: 8, r: 6.25, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, pathLength: 16, strokeDasharray: '1.25 0.75' }),
  )

const picture = (src: string, size: number) =>
  img({ src, alt: '', width: size, height: size, draggable: false, class: ['shrink-0', size > 32 ? 'rounded-2xl' : 'rounded-sm'], style: { width: `${size}px`, height: `${size}px` } })

export const projectIcon = (name: string, look: ProjectLook = {}, size = 16) => {
  if (look.quick) return quickMark(size)
  if (look.app) return appIcon(size)
  return picture(look.file || duneIcon(name, look), size)
}

export const projectAvatar = (name: ReactiveValue<string>, look: ReactiveValue<ProjectLook | undefined>, size = 16) =>
  dynamicChild(
    derive(() => JSON.stringify([read(name), read(look) ?? {}])),
    key => {
      const [current, found] = JSON.parse(key) as [string, ProjectLook]
      return projectIcon(current, found, size)
    },
  )
