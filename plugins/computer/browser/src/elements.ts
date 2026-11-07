import type { Box, Point, UiElement } from '@sand/computers/contract'
import type { Viewport } from './input'
import type { Call, FrameSession } from './tabs'

interface AxValue {
  value?: unknown
}

export interface AxNode {
  nodeId: string
  parentId?: string
  ignored: boolean
  role?: AxValue
  name?: AxValue
  backendDOMNodeId?: number
}

interface Named {
  node: AxNode
  id: number
  role: string
  name: string
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

const text = (value: AxValue | undefined) => (typeof value?.value === 'string' ? value.value.trim() : '')

const kept = (node: AxNode): Named | undefined => {
  const role = text(node.role)
  const name = text(node.name)
  const id = node.backendDOMNodeId
  if (node.ignored || id === undefined) return undefined
  if (interactive.has(role) || (name && !structural.has(role))) return { node, id, role: roles[role] ?? role, name }
  return undefined
}

const repeatsAncestor = (named: Named, byId: Map<string, AxNode>, keptIds: Map<string, Named>) => {
  for (let id = named.node.parentId; id; id = byId.get(id)?.parentId) {
    const ancestor = keptIds.get(id)
    if (ancestor) return ancestor.name.includes(named.name)
  }
  return false
}

export const pickNodes = (nodes: AxNode[]): Named[] => {
  const byId = new Map(nodes.map(node => [node.nodeId, node]))
  const keptIds = new Map(nodes.flatMap(node => {
    const named = kept(node)
    return named ? [[node.nodeId, named] as const] : []
  }))
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

export const quadsBox = (quads: number[][], viewport: Viewport): Box | undefined => {
  const box = clipped(pixelBox(quads, { x: 0, y: 0 }), screen(viewport))
  return box && fractions(box, viewport)
}

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

const frameElements = async (frame: Frame, viewport: Viewport): Promise<UiElement[]> => {
  const { nodes } = await frame.call<{ nodes: AxNode[] }>('Accessibility.getFullAXTree', { frameId: frame.tree.frame.id })
  const placed = await Promise.all(
    pickNodes(nodes).map(async ({ id, role, name }) => {
      const box = await nodeBox(frame, id)
      return box ? [{ ref: `${frame.ref}${id}`, role, name, box: fractions(box, viewport) }] : []
    }),
  )
  return placed.flat()
}

export const pageElements = async (call: Call, framesIn: FramesIn, viewport: Viewport): Promise<UiElement[]> => {
  const { frameTree } = await call<{ frameTree: FrameTree }>('Page.getFrameTree')
  const walk = async (frame: Frame): Promise<UiElement[]> => {
    const [own, inner] = await Promise.all([frameElements(frame, viewport), children(frame, framesIn)])
    return [...own, ...(await Promise.all(inner.map(walk))).flat()]
  }
  return walk({ tree: frameTree, call, ref: '', origin: { x: 0, y: 0 }, clip: screen(viewport) })
}
