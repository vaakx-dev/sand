import type { Box, UiElement } from '@sand/computers/contract'
import type { Viewport } from './input'
import type { Call } from './tabs'

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

export const quadsBox = (quads: number[][], viewport: Viewport): Box | undefined => {
  const xs = quads.flatMap(quad => quad.filter((_, index) => index % 2 === 0))
  const ys = quads.flatMap(quad => quad.filter((_, index) => index % 2 === 1))
  if (!xs.length) return undefined
  const left = Math.max(0, Math.min(...xs))
  const top = Math.max(0, Math.min(...ys))
  const right = Math.min(viewport.width, Math.max(...xs))
  const bottom = Math.min(viewport.height, Math.max(...ys))
  if (right <= left || bottom <= top) return undefined
  return { left: left / viewport.width, top: top / viewport.height, right: right / viewport.width, bottom: bottom / viewport.height }
}

const boxOf = async (call: Call, backendNodeId: number, viewport: Viewport) => {
  const quads = await call<{ quads: number[][] }>('DOM.getContentQuads', { backendNodeId }).then(
    ({ quads }) => quads,
    () => [],
  )
  return quadsBox(quads, viewport)
}

export const pageElements = async (call: Call, viewport: Viewport): Promise<UiElement[]> => {
  const { nodes } = await call<{ nodes: AxNode[] }>('Accessibility.getFullAXTree')
  const placed = await Promise.all(
    pickNodes(nodes).map(async ({ id, role, name }) => {
      const box = await boxOf(call, id, viewport)
      return box ? [{ ref: String(id), role, name, box }] : []
    }),
  )
  return placed.flat()
}
