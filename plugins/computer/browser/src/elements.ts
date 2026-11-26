import type { Box, Point, UiElement } from '@sand/computers/contract'
import type { Viewport } from './input'
import type { Call, FrameSession } from './tabs'

interface AxValue {
  value?: unknown
}

interface AxProperty {
  name: string
  value: AxValue
}

interface AxNode {
  nodeId: string
  parentId?: string
  childIds?: string[]
  ignored: boolean
  role?: AxValue
  name?: AxValue
  value?: AxValue
  properties?: AxProperty[]
  backendDOMNodeId?: number
}

type Shown = Omit<UiElement, 'ref' | 'box'>

interface Named extends Shown {
  node: AxNode
  id: number
  rank: number
}

export interface PageNode extends Shown {
  ref: string
  id: number
  rank: number
  call: Call
}

const interactive = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'checkbox',
  'radio',
  'combobox',
  'listbox',
  'option',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'tab',
  'slider',
  'spinbutton',
  'switch',
  'treeitem',
])

const structural = new Set(['RootWebArea', 'InlineTextBox', 'generic', 'none', 'LineBreak'])

const roles: Record<string, string> = { StaticText: 'text' }

const AREA_RANKS: Partial<Record<string, number>> = { main: 0, navigation: 2, complementary: 2, banner: 2, contentinfo: 2 }

const OUTSIDE_LANDMARKS_RANK = 1

const text = (value: AxValue | undefined) => (typeof value?.value === 'string' ? value.value.trim() : '')

const valueText = (value: AxValue | undefined) => (typeof value?.value === 'string' || typeof value?.value === 'number' ? String(value.value) : '')

const fieldsOf = (node: AxNode, name: string) => {
  const value = valueText(node.value)
  const href = text(node.properties?.find(property => property.name === 'url')?.value)
  return { ...(value && value !== name && { value }), ...(href && { href }) }
}

const rankOf = (node: AxNode, byId: Map<string, AxNode>) => {
  for (let id = node.parentId; id; id = byId.get(id)?.parentId) {
    const rank = AREA_RANKS[text(byId.get(id)?.role)]
    if (rank !== undefined) return rank
  }
  return OUTSIDE_LANDMARKS_RANK
}

const kept = (node: AxNode, byId: Map<string, AxNode>): Named | undefined => {
  const role = text(node.role)
  const name = text(node.name)
  const id = node.backendDOMNodeId
  const listable = interactive.has(role) || (name && !structural.has(role))
  if (node.ignored || id === undefined || !listable) return undefined
  return { node, id, rank: rankOf(node, byId), role: roles[role] ?? role, name, ...fieldsOf(node, name) }
}

const repeatsAncestor = (named: Named, byId: Map<string, AxNode>, keptIds: Map<string, Named>) => {
  for (let id = named.node.parentId; id; id = byId.get(id)?.parentId) {
    const ancestor = keptIds.get(id)
    if (ancestor) return ancestor.name.includes(named.name) || Boolean(ancestor.value?.includes(named.name))
  }
  return false
}

const documentOrder = (nodes: AxNode[], byId: Map<string, AxNode>) => {
  const visit = (node: AxNode): AxNode[] => [node, ...(node.childIds ?? []).flatMap(id => byId.get(id) ?? []).flatMap(visit)]
  const root = nodes.find(node => !node.parentId)
  return root ? visit(root) : []
}

const pickNodes = (nodes: AxNode[]): Named[] => {
  const byId = new Map(nodes.map(node => [node.nodeId, node]))
  const keptIds = new Map(
    documentOrder(nodes, byId).flatMap(node => {
      const named = kept(node, byId)
      return named ? [[node.nodeId, named] as const] : []
    }),
  )
  return [...keptIds.values()].filter(named => !(named.role === 'text' && repeatsAncestor(named, byId, keptIds)))
}

interface FrameTree {
  frame: { id: string }
  childFrames?: FrameTree[]
}

interface Frame {
  tree: FrameTree
  call: Call
  ref: string
  origin: Point
  clip: Box
}

export type FramesIn = (parent: string) => FrameSession[]

export interface Page {
  call: Call
  framesIn: FramesIn
  frameCall: (ref: string) => Call | undefined
  viewport: Viewport
}

const EVERYWHERE: Box = { left: -Infinity, top: -Infinity, right: Infinity, bottom: Infinity }

const pixelBox = (quads: number[][], origin: Point): Box | undefined => {
  const xs = quads.flatMap(quad => quad.filter((_, index) => index % 2 === 0))
  const ys = quads.flatMap(quad => quad.filter((_, index) => index % 2 === 1))
  if (!xs.length) return undefined
  return { left: Math.min(...xs) + origin.x, top: Math.min(...ys) + origin.y, right: Math.max(...xs) + origin.x, bottom: Math.max(...ys) + origin.y }
}

const clipped = (box: Box | undefined, clip: Box): Box | undefined => {
  if (!box) return undefined
  const inside = { left: Math.max(box.left, clip.left), top: Math.max(box.top, clip.top), right: Math.min(box.right, clip.right), bottom: Math.min(box.bottom, clip.bottom) }
  return inside.right > inside.left && inside.bottom > inside.top ? inside : undefined
}

const fractions = (box: Box, viewport: Viewport): Box => ({
  left: box.left / viewport.width,
  top: box.top / viewport.height,
  right: box.right / viewport.width,
  bottom: box.bottom / viewport.height,
})

const screen = (viewport: Viewport): Box => ({ left: 0, top: 0, right: viewport.width, bottom: viewport.height })

const nodeBox = async ({ call, origin, clip }: Frame, backendNodeId: number) => {
  const quads = await call<{ quads: number[][] }>('DOM.getContentQuads', { backendNodeId }).then(
    ({ quads }) => quads,
    () => [],
  )
  return clipped(pixelBox(quads, origin), clip)
}

const ownerBox = async ({ call, origin }: Frame, frameId: string) => {
  const owner = await call<{ backendNodeId: number }>('DOM.getFrameOwner', { frameId })
  const { model } = await call<{ model: { content: number[] } }>('DOM.getBoxModel', { backendNodeId: owner.backendNodeId })
  return pixelBox([model.content], origin)
}

const visibleOwner = (frame: Frame, frameId: string) => ownerBox(frame, frameId).catch(() => undefined)

const localChild = async (frame: Frame, tree: FrameTree): Promise<Frame | undefined> => {
  const clip = clipped(await visibleOwner(frame, tree.frame.id), frame.clip)
  return clip && { ...frame, tree, clip }
}

const remoteChild = async (frame: Frame, { id, call, ref }: FrameSession): Promise<Frame | undefined> => {
  const box = await visibleOwner(frame, id)
  const clip = clipped(box, frame.clip)
  if (!box || !clip) return undefined
  const { frameTree } = await call<{ frameTree: FrameTree }>('Page.getFrameTree')
  return { tree: frameTree, call, ref: `${ref}.`, origin: { x: box.left, y: box.top }, clip }
}

const children = async (frame: Frame, framesIn: FramesIn) => {
  const local = (frame.tree.childFrames ?? []).map(tree => localChild(frame, tree))
  const remote = framesIn(frame.tree.frame.id).map(session => remoteChild(frame, session))
  return (await Promise.all([...local, ...remote])).filter(child => child !== undefined)
}

const frameNodes = async (frame: Frame) => {
  const { nodes } = await frame.call<{ nodes: AxNode[] }>('Accessibility.getFullAXTree', { frameId: frame.tree.frame.id })
  return pickNodes(nodes)
}

const eachFrame = async <T>(call: Call, framesIn: FramesIn, clip: Box, visit: (frame: Frame) => Promise<T[]>): Promise<T[]> => {
  const { frameTree } = await call<{ frameTree: FrameTree }>('Page.getFrameTree')
  const walk = async (frame: Frame): Promise<T[]> => {
    const [own, inner] = await Promise.all([visit(frame), children(frame, framesIn)])
    return [...own, ...(await Promise.all(inner.map(walk))).flat()]
  }
  return walk({ tree: frameTree, call, ref: '', origin: { x: 0, y: 0 }, clip })
}

const placedElements = async (frame: Frame, viewport: Viewport): Promise<UiElement[]> => {
  const placed = await Promise.all(
    (await frameNodes(frame)).map(async ({ node, id, rank, ...shown }) => {
      const box = await nodeBox(frame, id)
      return box ? [{ ref: `${frame.ref}${id}`, ...shown, box: fractions(box, viewport) }] : []
    }),
  )
  return placed.flat()
}

const listedNodes = async (frame: Frame): Promise<PageNode[]> =>
  (await frameNodes(frame)).map(({ node, ...named }) => ({ ...named, ref: `${frame.ref}${named.id}`, call: frame.call }))

const visibleFrames = ({ call, framesIn, viewport }: Page) => eachFrame(call, framesIn, screen(viewport), async frame => [frame])

export const pageElements = ({ call, framesIn, viewport }: Page) => eachFrame(call, framesIn, screen(viewport), frame => placedElements(frame, viewport))

export const pageNodes = (call: Call, framesIn: FramesIn) => eachFrame(call, framesIn, EVERYWHERE, listedNodes)

export const refParts = (ref: string) => {
  const frame = ref.slice(0, ref.lastIndexOf('.') + 1)
  return { session: frame.slice(0, -1), frame, node: Number(ref.slice(frame.length)) }
}

const gone = (ref: string) => new Error(`Element ${ref} is no longer shown on the page. Call computer_elements again.`)

const checkSame = async (call: Call, node: number, { ref, role, name }: UiElement) => {
  const { nodes } = await call<{ nodes: AxNode[] }>('Accessibility.getPartialAXTree', { backendNodeId: node, fetchRelatives: false }).catch(() => {
    throw gone(ref)
  })
  const now = nodes[0] && kept(nodes[0], new Map())
  if (!now) throw gone(ref)
  if (now.role !== role || now.name !== name) {
    throw new Error(`Element ${ref} is now ${now.role} "${now.name}", not ${role} "${name}". Call computer_elements again.`)
  }
}

const scrollIntoView = (call: Call, node: number, ref: string) =>
  call('DOM.scrollIntoViewIfNeeded', { backendNodeId: node }).catch(() => {
    throw gone(ref)
  })

export const locateElement = async (page: Page, element: UiElement): Promise<Box> => {
  const { session, frame, node } = refParts(element.ref)
  const call = session ? page.frameCall(session) : page.call
  if (!call) throw gone(element.ref)
  await checkSame(call, node, element)
  await scrollIntoView(call, node, element.ref)
  const placed = (await visibleFrames(page)).find(each => each.ref === frame)
  const box = placed && (await nodeBox(placed, node))
  if (!box) throw new Error(`Element ${element.ref} is still off screen after scrolling to it. Take a screenshot to see where it is.`)
  return fractions(box, page.viewport)
}
