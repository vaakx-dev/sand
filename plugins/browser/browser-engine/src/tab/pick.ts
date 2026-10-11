import type { Cdp } from '../chrome'
import type { Picked, Point } from '../contract'
import { accessible } from './locate'

interface Described {
  selector: string
  component?: string
  text: string
  html: string
  rect: { x: number; y: number; width: number; height: number }
}

const highlight = { contentColor: { r: 59, g: 130, b: 246, a: 0.18 }, borderColor: { r: 59, g: 130, b: 246, a: 0.9 }, showInfo: true }

const padding = 8

const describeElement = `function () {
  const element = this.nodeType === 1 ? this : this.parentElement
  const step = node => {
    if (node.id) return '#' + CSS.escape(node.id)
    const name = node.localName
    const parent = node.parentElement
    if (!parent) return name
    const same = [...parent.children].filter(child => child.localName === name)
    return same.length > 1 ? name + ':nth-of-type(' + (same.indexOf(node) + 1) + ')' : name
  }
  const path = []
  for (let node = element; node && node.nodeType === 1 && path.length < 6; node = node.parentElement) {
    path.unshift(step(node))
    if (node.id) break
  }
  const fiberKey = Object.keys(element).find(key => key.startsWith('__reactFiber$'))
  let component
  for (let fiber = fiberKey && element[fiberKey]; fiber && !component; fiber = fiber.return) {
    if (typeof fiber.type === 'function') component = fiber.type.displayName || fiber.type.name
  }
  const { x, y, width, height } = element.getBoundingClientRect()
  return {
    selector: path.join(' > '),
    component,
    text: (element.innerText || '').trim().slice(0, 300),
    html: element.outerHTML.slice(0, 1500),
    rect: { x, y, width, height },
  }
}`

const nodeAt = async (cdp: Cdp, { x, y }: Point) =>
  (await cdp.send<{ backendNodeId: number }>('DOM.getNodeForLocation', { x: Math.round(x), y: Math.round(y), ignorePointerEventsNone: true })).backendNodeId

const read = async (cdp: Cdp, backendNodeId: number) => {
  const { object } = await cdp.send<{ object: { objectId: string } }>('DOM.resolveNode', { backendNodeId })
  const { result } = await cdp.send<{ result: { value: Described } }>('Runtime.callFunctionOn', {
    objectId: object.objectId,
    functionDeclaration: describeElement,
    returnByValue: true,
  })
  return result.value
}

const crop = async (cdp: Cdp, rect: Described['rect']) => {
  const x = Math.max(0, rect.x - padding)
  const y = Math.max(0, rect.y - padding)
  const clip = { x, y, width: rect.width + padding * 2, height: rect.height + padding * 2, scale: 1 }
  if (clip.width < 1 || clip.height < 1) return undefined
  return (await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png', clip })).data
}

export const inspect = async (cdp: Cdp, point?: Point) => {
  if (!point) {
    await cdp.send('Overlay.hideHighlight')
    return
  }
  await cdp.send('Overlay.highlightNode', { highlightConfig: highlight, backendNodeId: await nodeAt(cdp, point) })
}

export const pick = async (cdp: Cdp, point: Point, url: string): Promise<Picked> => {
  await cdp.send('Overlay.hideHighlight')
  const backendNodeId = await nodeAt(cdp, point)
  const described = await read(cdp, backendNodeId)
  const [{ role, name }, image] = await Promise.all([accessible(cdp, backendNodeId), crop(cdp, described.rect)])
  return {
    url,
    selector: described.selector,
    role,
    name,
    ...(described.component && { component: described.component }),
    text: described.text,
    html: described.html,
    ...(image && { image }),
  }
}
