import { expect, test } from 'bun:test'
import { pointOf } from '../src/contract'
import { contains } from '../src/frame'
import { withStrategy } from '../src/strategies'
import { greenFinder, screen } from './fakes'

const target = { left: 0.71, top: 0.33, right: 0.72, bottom: 0.35 }

test('single drops the element list and passes one look through', async () => {
  const { finder, seen } = greenFinder('point')
  const shot = await screen(800, 500, target)
  const found = await withStrategy(finder, { kind: 'single' }).locate({ screenshot: shot, target: 'green', elements: [{ ref: 'a', role: 'button', name: 'A', box: target }] })
  expect(seen).toEqual([{ width: 800, height: 500, elements: [] }])
  expect(contains(target, pointOf(found.hit)!)).toBe(true)
})

test('zoom keeps looking closer until it is sure, and adds up what each look cost', async () => {
  const { finder, seen } = greenFinder('point', 0.003)
  const shot = await screen(800, 500, target)
  const found = await withStrategy(finder, { kind: 'zoom', scale: 2, rounds: 4, confidence: 0.9 }).locate({ screenshot: shot, target: 'green' })
  expect(seen).toHaveLength(3)
  expect(seen.every(look => look.width === 800 && look.height === 500)).toBe(true)
  expect(found.hit?.kind).toBe('point')
  expect(contains(target, pointOf(found.hit)!)).toBe(true)
  expect(found.usage).toEqual({ inputTokens: 30, outputTokens: 6 })
  expect(found.costUsd).toBeCloseTo(0.003)
})

test('zoom stops after its last round even when unsure', async () => {
  const { finder, seen } = greenFinder('point', 1)
  const shot = await screen(800, 500, target)
  await withStrategy(finder, { kind: 'zoom', scale: 4, rounds: 2, confidence: 0.9 }).locate({ screenshot: shot, target: 'green' })
  expect(seen).toHaveLength(2)
})

test('grid narrows to the picked cell each round and lands on the target', async () => {
  const { finder, seen } = greenFinder('ref')
  const shot = await screen(1280, 800, target)
  const found = await withStrategy(finder, { kind: 'grid', size: 4, rounds: 4 }).locate({ screenshot: shot, target: 'green' })
  expect(seen).toHaveLength(4)
  expect(seen[0]!.elements.map(cell => cell.ref)).toEqual(Array.from({ length: 16 }, (_, at) => String(at + 1)))
  expect(contains(target, pointOf(found.hit)!)).toBe(true)
})

test('marks number the elements and answer with the original ref', async () => {
  const { finder, seen } = greenFinder('ref')
  const shot = await screen(800, 500, target)
  const elements = [
    { ref: 'save', role: 'button', name: 'Save', box: { left: 0.1, top: 0.1, right: 0.2, bottom: 0.15 } },
    { ref: 'go', role: 'button', name: 'Go', box: { left: 0.7, top: 0.32, right: 0.73, bottom: 0.36 } },
  ]
  const found = await withStrategy(finder, { kind: 'marks' }).locate({ screenshot: shot, target: 'green', elements })
  expect(seen[0]!.elements.map(mark => [mark.ref, mark.name])).toEqual([
    ['1', ''],
    ['2', ''],
  ])
  expect(found.hit).toEqual({ kind: 'element', ref: 'go' })
  expect(pointOf(found.hit, elements)!.y).toBeCloseTo(0.34)
})

test('a finder that sees nothing gives no hit', async () => {
  const { finder } = greenFinder('point')
  const shot = await screen(400, 300, { left: 0, top: 0, right: 0, bottom: 0 })
  const found = await withStrategy(finder, { kind: 'zoom', scale: 2, rounds: 3, confidence: 0.5 }).locate({ screenshot: shot, target: 'green' })
  expect(found.hit).toBeNull()
})
