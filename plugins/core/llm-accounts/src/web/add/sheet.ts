import { place } from '@sand/kit/web'
import type { Kit } from '@sand/ui-kit/contract'
import type { Context, Dispose } from 'drydock'
import type { LoginControl } from '../state'
import { addFlow } from './add-flow'
import type { Step } from './steps'

const sheetView = (kit: Kit, control: LoginControl, done: (text?: string) => void, first?: Step) => {
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

export const addAccount = (ctx: Context<'kit'>, control: LoginControl) => {
  let unplace: Dispose | undefined
  const close = () => {
    void unplace?.()
    unplace = undefined
  }
  const finished = (text?: string) => {
    close()
    if (text) ctx.notify?.push(text)
  }
  const open = (step?: Step) => {
    close()
    unplace = place(ctx, 'overlay', () => sheetView(ctx.kit, control, finished, step), 100)
  }
  ctx.effect(() => close)
  return { open }
}

export type AddAccount = ReturnType<typeof addAccount>
