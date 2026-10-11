import { icon, iconButton, overlay, place, sheet, sheetBody, sheetHead, show } from '@sand/dom'
import type { Context, Dispose } from 'drydock'
import type { LoginControl } from '../state'
import { addFlow } from './add-flow'
import type { Step } from './steps'

const sheetView = (control: LoginControl, done: (text?: string) => void, first?: Step) => {
  const add = addFlow(control, done)

  const close = () => {
    add.cancel()
    done()
  }

  if (first) add.go(first)

  return overlay(
    close,
    sheet(
      { 'aria-label': 'Add account', class: 'max-w-md' },
      sheetHead(
        add.title,
        close,
        show(
          () => add.step.get().kind !== 'choose',
          () => iconButton({ title: 'Back', onClick: add.back }, icon('back')),
        ),
      ),
      sheetBody({ class: 'gap-4' }, add.view()),
    ),
  )
}

export const addAccount = (ctx: Context, control: LoginControl) => {
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
    unplace = place(ctx, 'overlay', () => sheetView(control, finished, step), 100)
  }
  ctx.effect(() => close)
  return { open }
}

export type AddAccount = ReturnType<typeof addAccount>
