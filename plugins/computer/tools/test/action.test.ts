import type { UiElement } from '@sand/computers/contract'
import { expect, test } from 'bun:test'
import { actionInput, resolveAction } from '../src/action'

const button: UiElement = { ref: 'e1', role: 'button', name: 'Save', box: { left: 0.25, top: 0.375, right: 0.75, bottom: 0.625 } }
const find = (ref: string) => (ref === button.ref ? button : undefined)
const resolve = (input: unknown) => resolveAction(actionInput.parse(input), find)

test('element refs resolve to the center of their box', () => {
  expect(resolve({ type: 'click', at: { ref: 'e1' } })).toEqual({ type: 'click', at: { x: 0.5, y: 0.5 } })
  expect(resolve({ type: 'drag', from: { ref: 'e1' }, to: { x: 0.9, y: 0.1 } })).toMatchObject({ to: { x: 0.9, y: 0.1 } })
  expect(resolve({ type: 'scroll', at: { x: 0.5, y: 0.5 }, dy: 3 })).toEqual({ type: 'scroll', at: { x: 0.5, y: 0.5 }, dx: 0, dy: 3 })
  expect(() => resolve({ type: 'right_click', at: { ref: 'e9' } })).toThrow('No element e9')
})

test('key combos parse at the edge, and positions outside the screenshot or odd links are refused', () => {
  expect(resolve({ type: 'key', keys: 'ctrl+s' })).toMatchObject({ type: 'key', keys: [{ name: 'ctrl' }, { name: 's' }] })
  expect(actionInput.safeParse({ type: 'click', at: { x: 1.2, y: 0.5 } }).success).toBe(false)
  expect(actionInput.safeParse({ type: 'open', url: 'file:///c:/windows/system32/calc.exe' }).success).toBe(false)
  expect(actionInput.safeParse({ type: 'open', url: 'https://example.com' }).success).toBe(true)
})
