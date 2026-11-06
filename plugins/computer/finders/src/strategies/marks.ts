import type { UiElement } from '@sand/computers/contract'
import type { Finder, Hit } from '../contract'
import { marked } from '../image/view'

const original = (hit: Hit, elements: UiElement[]): Hit => (hit?.kind === 'element' ? { kind: 'element', ref: elements[Number(hit.ref) - 1]!.ref } : hit)

export const marks = (finder: Finder): Finder => ({
  id: `${finder.id}/marks`,
  label: `${finder.label}, numbered marks`,
  async locate({ screenshot, target, elements = [] }, signal) {
    const started = performance.now()
    const numbered = elements.map((element, index) => ({ ref: String(index + 1), role: '', name: '', box: element.box }))
    const found = await finder.locate({ screenshot: await marked(screenshot, numbered, 'outside'), target, elements: numbered }, signal)
    return { ...found, hit: original(found.hit, elements), ms: performance.now() - started }
  },
})
