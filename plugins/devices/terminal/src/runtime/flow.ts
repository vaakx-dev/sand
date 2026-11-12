import type { Caller } from '@sand/host-hub/contract'
import { type Frame, limits, type Size } from '../contract'
import type { History } from './history'
import { withoutQueries } from './replay'

export interface Viewer {
  id: string
  caller?: Caller
  sent: number
  acked: number
  input: number
  size?: Size
}

export const take = (id: string, history: History, viewer: Viewer): Frame | undefined => {
  const end = history.end()
  const room = limits.window - (viewer.sent - viewer.acked)
  if (viewer.sent >= end || room <= 0) return undefined
  if (viewer.sent < history.start() || end - viewer.sent > limits.snapshot) {
    if (viewer.sent !== viewer.acked) return undefined
    const from = history.recent(limits.snapshot)
    const to = history.cut(from, limits.snapshot)
    const data = withoutQueries(history.read(from, to))
    viewer.sent = to
    viewer.acked = to - data.length
    return { id, data, end: to, grid: history.gridAt(from), reset: true }
  }
  const from = viewer.sent
  const to = history.cut(from, Math.min(limits.frame, room))
  viewer.sent = to
  return { id, data: history.read(from, to), end: to, grid: history.gridAt(from) }
}

export const sharedGrid = (viewers: Iterable<Viewer>): Size | undefined => {
  let grid: Size | undefined
  for (const { caller, size } of viewers) {
    if (!caller || !size) continue
    grid = grid ? { cols: Math.min(grid.cols, size.cols), rows: Math.min(grid.rows, size.rows) } : size
  }
  return grid
}
