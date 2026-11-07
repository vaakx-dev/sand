import type { Found } from '@sand/computers/contract'
import { quadsBox } from './elements'
import { evaluate } from './evaluate'
import type { Viewport } from './input'
import type { Call } from './tabs'

interface Hits {
  count: number
  quad?: number[]
}

const script = (text: string, match: number) => `(() => {
  const query = ${JSON.stringify(text.toLowerCase())}
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const hits = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement.checkVisibility()) continue
    const lower = node.data.toLowerCase()
    for (let at = lower.indexOf(query); at >= 0; at = lower.indexOf(query, at + query.length)) hits.push([node, at])
  }
  const hit = hits[${match - 1}]
  if (!hit) return { count: hits.length }
  const [node, at] = hit
  node.parentElement.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' })
  const range = document.createRange()
  range.setStart(node, at)
  range.setEnd(node, at + query.length)
  const { left, top, right, bottom } = range.getBoundingClientRect()
  return { count: hits.length, quad: [left, top, right, top, right, bottom, left, bottom] }
})()`

export const findText = async (call: Call, viewport: Viewport, text: string, match: number): Promise<Found> => {
  const { result, exceptionDetails } = await evaluate<Hits>(call, { expression: script(text, match) })
  if (exceptionDetails) throw new Error(`Could not search the page: ${exceptionDetails.text}`)
  const { count, quad } = result.value
  return { count, box: quad && quadsBox([quad], viewport) }
}
