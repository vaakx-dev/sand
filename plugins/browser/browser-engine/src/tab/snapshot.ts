import type { Cdp } from '../chrome'

interface AxValue {
  value?: unknown
}

interface AxNode {
  nodeId: string
  ignored: boolean
  role?: AxValue
  name?: AxValue
  value?: AxValue
  properties?: { name: string; value: AxValue }[]
  childIds?: string[]
  backendDOMNodeId?: number
}

const maxChars = 20_000
const maxName = 100

const transparent = new Set([
  'generic',
  'none',
  'presentation',
  'InlineTextBox',
  'LineBreak',
  'RootWebArea',
  'Section',
  'LabelText',
  'LayoutTable',
  'LayoutTableRow',
  'LayoutTableCell',
])

const actionable = new Set([
  'button',
  'link',
  'textbox',
  'searchbox',
  'combobox',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'spinbutton',
  'tab',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'treeitem',
  'listbox',
])

const shownStates = ['checked', 'disabled', 'expanded', 'selected', 'pressed', 'level', 'required', 'invalid']

const text = (value: AxValue | undefined) => String(value?.value ?? '').replace(/\s+/g, ' ').trim()

const clip = (value: string) => (value.length > maxName ? `${value.slice(0, maxName)}…` : value)

const states = (node: AxNode) =>
  (node.properties ?? [])
    .filter(property => shownStates.includes(property.name) && property.value.value !== false && property.value.value !== 'false')
    .map(property => (property.value.value === true || property.value.value === 'true' ? `[${property.name}]` : `[${property.name}=${property.value.value}]`))

const focusable = (node: AxNode) => (node.properties ?? []).some(property => property.name === 'focusable' && property.value.value === true)

const line = (node: AxNode, role: string, name: string) => {
  const ref = node.backendDOMNodeId && (actionable.has(role) || focusable(node)) ? ` [ref=e${node.backendDOMNodeId}]` : ''
  const value = text(node.value)
  return [`- ${role}`, name && ` "${clip(name)}"`, ...states(node).map(state => ` ${state}`), ref, value && value !== name ? `: ${clip(value)}` : ''].join('')
}

const render = (nodes: AxNode[]) => {
  const byId = new Map(nodes.map(node => [node.nodeId, node]))
  const lines: string[] = []

  const walk = (node: AxNode, depth: number, context: string) => {
    const role = text(node.role)
    const name = text(node.name)
    const children = (node.childIds ?? []).flatMap(id => byId.get(id) ?? [])
    if (role === 'StaticText') {
      if (/[\p{L}\p{N}]/u.test(name) && !context.includes(name)) lines.push(`${'  '.repeat(depth)}- text: ${clip(name)}`)
      return
    }
    const shown = !node.ignored && !transparent.has(role) && Boolean(role)
    if (shown) lines.push(`${'  '.repeat(depth)}${line(node, role, name)}`)
    for (const child of children) walk(child, shown ? depth + 1 : depth, shown && name ? name : context)
  }

  if (nodes[0]) walk(nodes[0], 0, '')
  return lines
}

const trimmed = (lines: string[]) => {
  let total = 0
  const kept = lines.filter(entry => (total += entry.length + 1) <= maxChars)
  if (kept.length === lines.length) return kept.join('\n')
  return `${kept.join('\n')}\n… ${lines.length - kept.length} more lines cut. Scroll and snapshot again, or use browser_eval to read a part.`
}

export const snapshot = async (cdp: Cdp) => {
  const { nodes } = await cdp.send<{ nodes: AxNode[] }>('Accessibility.getFullAXTree')
  const lines = render(nodes)
  return lines.length ? trimmed(lines) : 'The page has no readable content yet.'
}
