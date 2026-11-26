import { matchesText, type Found } from '@sand/computers/contract'
import { pageNodes, type FramesIn } from './elements'
import type { Call } from './tabs'

export const findNode = async (call: Call, framesIn: FramesIn, text: string, match: number): Promise<Found> => {
  const nodes = await pageNodes(call, framesIn)
  const hits = nodes.filter(node => matchesText(node, text)).sort((one, other) => one.rank - other.rank)
  const hit = hits[match - 1]
  if (!hit) return { count: hits.length }
  await hit.call('DOM.scrollIntoViewIfNeeded', { backendNodeId: hit.id })
  return { count: hits.length, ref: hit.ref }
}
