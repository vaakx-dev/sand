import type { HtmlRenderEntry } from '../contract'
import { maxHeight, minHeight, startHeight } from '../page/limits'
import { stored, untrack } from '@vaakx-dev/vrui'

const kept = 300

export interface FrameHeights {
  get(id: string): number | undefined
  set(id: string, height: number): void
}

export const frameHeights = (): FrameHeights => {
  const saved = stored<Record<string, number>>('sand.html.heights', {})
  const heights = new Map(Object.entries(untrack(() => saved.get())))

  const trim = () => {
    for (const id of heights.keys()) {
      if (heights.size <= kept) return
      heights.delete(id)
    }
  }

  return {
    get: id => heights.get(id),
    set(id, height) {
      if (heights.get(id) === height) return
      heights.delete(id)
      heights.set(id, height)
      trim()
      saved.set(Object.fromEntries(heights))
    },
  }
}

export const frameHeight = (data: HtmlRenderEntry, measured: number | undefined, remembered: number | undefined) =>
  Math.min(maxHeight, Math.max(minHeight, Math.ceil(measured ?? remembered ?? data.height ?? startHeight)))
