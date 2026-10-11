import type { Cdp } from '../chrome'
import type { Point } from '../contract'

interface AxNode {
  role?: { value: string }
  name?: { value: string }
}

const refPattern = /^e(\d+)$/

export const nodeOf = (ref: string) => {
  const found = refPattern.exec(ref.trim())
  if (!found) throw new Error(`"${ref}" is not a ref. Use one like e12 from browser_snapshot.`)
  return Number(found[1])
}

const gone = (ref: string) => new Error(`${ref} is no longer on the page. Take a new browser_snapshot.`)

const center = (quad: number[]): Point => ({
  x: Math.round((quad[0]! + quad[2]! + quad[4]! + quad[6]!) / 4),
  y: Math.round((quad[1]! + quad[3]! + quad[5]! + quad[7]!) / 4),
})

export const pointOf = async (cdp: Cdp, ref: string) => {
  const backendNodeId = nodeOf(ref)
  try {
    await cdp.send('DOM.scrollIntoViewIfNeeded', { backendNodeId })
    const { quads } = await cdp.send<{ quads: number[][] }>('DOM.getContentQuads', { backendNodeId })
    if (!quads[0]) throw new Error(`${ref} has no visible area to click`)
    return center(quads[0])
  } catch (error) {
    if (error instanceof Error && error.message.includes('No node')) throw gone(ref)
    throw error
  }
}

export const accessible = async (cdp: Cdp, backendNodeId: number) => {
  const { nodes } = await cdp.send<{ nodes: AxNode[] }>('Accessibility.getPartialAXTree', { backendNodeId, fetchRelatives: false })
  return { role: nodes[0]?.role?.value ?? 'element', name: nodes[0]?.name?.value?.trim() ?? '' }
}

export const describe = async (cdp: Cdp, ref: string) => {
  const { role, name } = await accessible(cdp, nodeOf(ref))
  return name ? `${role} "${name.slice(0, 80)}"` : `${role} ${ref}`
}
