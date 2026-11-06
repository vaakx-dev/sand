import type { Call } from './tabs'

export interface InputMark {
  page: number
  count: number
}

export const countInputs = `if (!('__sandInputs' in window)) {
  window.__sandInputs = 0
  for (const type of ['pointerdown', 'keydown', 'wheel']) addEventListener(type, () => window.__sandInputs++, true)
}`

const navigating: InputMark = { page: Number.NaN, count: 0 }

export const markInputs = async (call: Call): Promise<InputMark> => {
  const read = call<{ result: { value: [number, number] } }>('Runtime.evaluate', {
    expression: '[performance.timeOrigin, window.__sandInputs ?? 0]',
    returnByValue: true,
  })
  return read.then(
    ({ result }) => ({ page: result.value[0], count: result.value[1] }),
    () => navigating,
  )
}

export const inputSince = (before: InputMark, now: InputMark) => (now.page === before.page ? now.count > before.count : now.count > 0)
