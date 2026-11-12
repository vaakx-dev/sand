import { sheetSlot, type SheetSpec } from '@sand/ui-shell/contract'
import type { Kit, kit } from '@sand/ui-kit/contract'
import { show } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import type { LoginControl } from '../state'
import { addFlow } from './add-flow'
import type { Step } from './steps'

const addSheet = (kit: Kit, control: LoginControl, done: () => void, first?: Step): SheetSpec => {
  const { icon, iconButton, sheetTitle } = kit
  const add = addFlow(control, done)

  if (first) add.go(first)

  return {
    label: 'Add an account',
    look: 'bare',
    head: () => [
      show(
        () => add.step.get().kind !== 'choose',
        () => iconButton({ title: 'Back', 'aria-label': 'Back', surface: 'raised', onClick: add.back }, icon('back', 'md')),
      ),
      sheetTitle(add.title),
    ],
    body: () => add.view(kit, 'raised'),
    onClose: add.cancel,
  }
}

export const addAccount = (ctx: Context<{ kit: typeof kit }>, control: LoginControl) => {
  const sheet = sheetSlot(ctx)
  return { open: (step?: Step) => sheet.open(() => addSheet(ctx.kit, control, sheet.close, step)) }
}

export type AddAccount = ReturnType<typeof addAccount>
