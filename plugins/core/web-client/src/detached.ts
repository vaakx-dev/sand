import { collectScope, onInterval, onRaf, onTimeout } from '@sand/dom'
import type { Context } from 'drydock'

export const after = (ms: number, run: () => void) => collectScope(() => onTimeout(run, ms)).value

export const every = (ms: number, run: () => void) => collectScope(() => onInterval(run, ms)).value

export const nextFrame = (run: () => void) => collectScope(() => onRaf(run)).value

export const coalesced = (ctx: Context, run: () => void) => {
  let pending: (() => void) | undefined
  ctx.effect(() => () => pending?.())
  return () => {
    pending ??= after(0, () => {
      pending = undefined
      run()
    })
  }
}
