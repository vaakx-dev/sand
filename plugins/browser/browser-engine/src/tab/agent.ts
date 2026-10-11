import type { Cdp } from '../chrome'
import type { AgentControls, Point, ScrollDirection, Target, Viewport, WaitFor } from '../contract'
import type { Control } from './control'
import { evaluate, evaluateScript, painted } from './evaluate'
import { press } from './keys'
import { describe, nodeOf, pointOf } from './locate'
import type { TabLogs } from './logs'
import { click, wheel } from './mouse'
import type { Navigation } from './navigation'
import { snapshot } from './snapshot'

export interface AgentParts {
  cdp: Cdp
  navigation: Navigation
  logs: TabLogs
  control: Control
  viewport: () => Viewport
}

const settleMs = 150
const loadAfterActionMs = 10_000
const pollMs = 250
const scrollShare = 0.8

const selectContents = `function () {
  if (typeof this.select === 'function') return this.select()
  const range = document.createRange()
  range.selectNodeContents(this)
  getSelection().removeAllRanges()
  getSelection().addRange(range)
}`

const found = (text: string) => `document.body?.innerText.includes(${JSON.stringify(text)}) ?? false`

export const agentControls = ({ cdp, navigation, logs, control, viewport }: AgentParts): AgentControls => {
  const settle = async () => {
    await Bun.sleep(settleMs)
    await navigation.loaded(loadAfterActionMs)
    await painted(cdp)
  }

  const center = (): Point => ({ x: Math.round(viewport().width / 2), y: Math.round(viewport().height / 2) })

  const locate = async (target: Target) => {
    if (!('ref' in target)) return { point: target, label: `point ${target.x},${target.y}` }
    return { point: await pointOf(cdp, target.ref), label: await describe(cdp, target.ref) }
  }

  const selectAll = async (backendNodeId: number) => {
    const { object } = await cdp.send<{ object: { objectId: string } }>('DOM.resolveNode', { backendNodeId })
    await cdp.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: selectContents })
  }

  const screenshotClip = async (ref: string) => {
    await pointOf(cdp, ref)
    const { model } = await cdp.send<{ model: { border: number[]; width: number; height: number } }>('DOM.getBoxModel', { backendNodeId: nodeOf(ref) })
    return { x: model.border[0]!, y: model.border[1]!, width: model.width, height: model.height, scale: 1 }
  }

  const holds = async ({ text, gone }: WaitFor) =>
    (!text || Boolean(await evaluate(cdp, found(text)).catch(() => false))) && (!gone || !(await evaluate(cdp, found(gone)).catch(() => true)))

  return {
    open: url =>
      control.act('Opening', url, async () => {
        await navigation.open(url)
        await painted(cdp)
        return navigation.opened()
      }),
    history: action =>
      control.act('Going', action, async () => {
        await navigation.go(action)
        return navigation.opened()
      }),
    snapshot: () => snapshot(cdp),
    async screenshot(ref) {
      const clip = ref ? await screenshotClip(ref) : undefined
      return (await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'jpeg', quality: 80, ...(clip && { clip }) })).data
    },
    click: async (target, count) => {
      const { point, label } = await locate(target)
      return control.act('Clicking', label, async () => {
        control.point(point)
        await click(cdp, point, count)
        await settle()
        return label
      })
    },
    type: async (ref, text, { clear, submit }) => {
      const label = await describe(cdp, ref)
      return control.act('Typing into', label, async () => {
        const backendNodeId = nodeOf(ref)
        control.point(await pointOf(cdp, ref))
        await cdp.send('DOM.focus', { backendNodeId })
        if (clear) await selectAll(backendNodeId)
        if (text) await cdp.send('Input.insertText', { text })
        else if (clear) await press(cdp, 'Backspace')
        if (submit) await press(cdp, 'Enter')
        await settle()
        return label
      })
    },
    press: keys =>
      control.act('Pressing', keys, async () => {
        await press(cdp, keys)
        await settle()
      }),
    scroll: (direction: ScrollDirection, pages: number, ref?: string) =>
      control.act('Scrolling', direction, async () => {
        const point = ref ? await pointOf(cdp, ref) : center()
        const { width, height } = viewport()
        const sign = direction === 'up' || direction === 'left' ? -1 : 1
        const vertical = direction === 'up' || direction === 'down'
        const distance = Math.round(sign * pages * scrollShare * (vertical ? height : width))
        control.point(point)
        await wheel(cdp, point, vertical ? 0 : distance, vertical ? distance : 0)
        await settle()
      }),
    async wait(condition) {
      const deadline = Date.now() + condition.ms
      if (!condition.text && !condition.gone) {
        await Bun.sleep(condition.ms)
        return true
      }
      while (Date.now() < deadline) {
        if (await holds(condition)) return true
        await Bun.sleep(pollMs)
      }
      return false
    },
    evaluate: script => control.act('Running', 'a script', () => evaluateScript(cdp, script)),
    errorsSince: logs.errorsSince,
  }
}
