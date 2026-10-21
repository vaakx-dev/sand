import { place } from '@sand/layout/place'
import type { Kit, kit } from '@sand/ui-kit/contract'
import type { Context, Dispose } from 'drydock'
import type { LoginControl } from '../state'
import { addFlow } from './add-flow'
import type { Step } from './steps'

const sheetView = (kit: Kit, control: LoginControl, done: () => void, first?: Step) => {
  const { overlay, sheet, sheetHead } = kit
  const add = addFlow(control, done)

  const close = () => {
    add.cancel()
    done()
  }

  if (first) add.go(first)

  return overlay(
    close,
    sheet(
      { 'aria-label': 'Add an account', size: 'md' },
      sheetHead({ title: add.title, close, back: add.back, backShown: () => add.step.get().kind !== 'choose' }),
      add.view(kit),
    ),
  )
}

export const addAccount = (ctx: Context<{ kit: typeof kit }>, control: LoginControl) => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const open = (step?: Step) => {
    close()
    unplace = place(ctx, 'overlay', () => sheetView(ctx.kit, control, close, step), 100)
  }
  ctx.effect(() => close)
  return { open }
}

export type AddAccount = ReturnType<typeof addAccount>
