import { collectScope, onTimeout } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

export const after = (ms: number, run: () => void) => collectScope(() => onTimeout(run, ms)).value

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
