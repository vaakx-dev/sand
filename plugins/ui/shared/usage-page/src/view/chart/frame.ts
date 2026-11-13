import type { Kit } from '@sand/ui-kit/contract'
import { colorVar, div, line, span, svg, type Child } from '@vaakx-dev/vrui'

export interface AxisLabel {
  text: string
  top: string
}

export interface FrameProps {
  width: number
  height: number
  label: string
  axis: AxisLabel[]
  onPointerMove(event: PointerEvent): void
  onPointerLeave(event: PointerEvent): void
}

const axisLabel = ({ metaLine }: Kit, { text, top }: AxisLabel) =>
  span({ class: 'absolute right-0 -translate-y-1/2 whitespace-nowrap tabular-nums', style: { top } }, metaLine(text))

export const gridLine = (width: number, y: number) => line({ x1: 0, x2: width, y1: y, y2: y, stroke: colorVar('neutral', 700), vectorEffect: 'non-scaling-stroke' })

export const chartFrame = (kit: Kit, { width, height, label, axis, onPointerMove, onPointerLeave }: FrameProps, drawing: Child[], overlays: Child[], ticks: Child[]) =>
  div(
    { class: 'flex flex-col gap-2' },
    div(
      { class: 'flex gap-2' },
      div({ class: 'relative h-48 w-12 shrink-0' }, axis.map(label => axisLabel(kit, label))),
      div(
        { class: 'relative h-48 min-w-0 flex-1 cursor-default', style: { touchAction: 'pan-y' }, onPointerDown: onPointerMove, onPointerMove, onPointerLeave },
        svg({ viewBox: `0 0 ${width} ${height}`, preserveAspectRatio: 'none', width: '100%', height: '100%', role: 'img', 'aria-label': label }, ...drawing),
        ...overlays,
      ),
    ),
    div(
      { class: 'flex gap-2' },
      span({ class: 'w-12 shrink-0' }),
      div({ class: 'relative flex h-4 min-w-0 flex-1 justify-between' }, ...ticks),
    ),
  )
