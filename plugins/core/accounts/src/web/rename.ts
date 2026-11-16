import { picker } from '@sand/picker/contract'
import { oneLine } from '@sand/util'
import type { Context } from 'drydock'
import { loginRename, type LoginAccount } from '../contract'
import type { LoginControl } from './state'

export const accountRename = (ctx: Context, control: LoginControl) => async (account: LoginAccount) => {
  const input = ctx.get(picker)
  if (!input) return
  const name = oneLine((await input.input(`Rename ${account.label}`, account.label)) ?? '')
  if (name && name !== account.label) await control.run(loginRename, { account: account.id, name })
}
