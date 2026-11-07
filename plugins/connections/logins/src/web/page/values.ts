import type { Kit } from '@sand/ui-kit/contract'
import { show, sig, type Derive } from '@vaakx-dev/vrui'
import type { Login } from '../../contract'
import { task } from '../task'
import type { LoginPatch, LoginsModel } from './model'
import { editForm, field, formRow, rowProblem } from './parts'

type Change = (patch: LoginPatch) => Promise<unknown>

const credentialsRow = (kit: Kit, change: Change) =>
  formRow(kit, { title: 'Username and password', detail: 'Saved. Type new ones to replace them.', open: 'Replace' }, close => {
    const username = sig('')
    const password = sig('')
    return editForm(
      kit,
      { save: 'Replace', ready: () => Boolean(username.get() && password.get()), submit: () => change({ username: username.get(), password: password.get() }), done: close, cancel: close },
      field(kit, 'Username or email', { type: 'text', autocomplete: 'username', bindValue: username, onMount: node => node.focus() }),
      field(kit, 'Password', { type: 'password', autocomplete: 'new-password', bindValue: password }),
    )
  })

const valueRow = (kit: Kit, change: Change) =>
  formRow(kit, { title: 'Value', detail: 'Saved. Type a new one to replace it.', open: 'Replace' }, close => {
    const value = sig('')
    return editForm(
      kit,
      { save: 'Replace', ready: () => Boolean(value.get()), submit: () => change({ value: value.get() }), done: close, cancel: close },
      field(kit, 'New value', { type: 'password', bindValue: value, onMount: node => node.focus() }),
    )
  })

const totpRows = (kit: Kit, login: Derive<Login>, change: Change) => {
  const removing = task()
  const set = () => login.get().totp
  const remove = () =>
    kit.quietButton({ size: 'sm', surface: 'group', disabled: removing.busy, onClick: () => void removing.run(() => change({ totp: null })) }, 'Remove')
  return [
    formRow(
      kit,
      {
        title: 'Authenticator',
        detail: () => (set() ? 'Set. Agents make the sign-in codes themselves.' : 'Not set. Add the setup key if the site asks for codes from an app.'),
        open: () => (set() ? 'Replace' : 'Add'),
        extra: () => show(set, remove),
      },
      close => {
        const secret = sig('')
        return editForm(
          kit,
          { save: 'Save', ready: () => Boolean(secret.get().trim()), submit: () => change({ totp: secret.get().trim() }), done: close, cancel: close },
          field(kit, 'Setup key or otpauth:// link', { type: 'password', bindValue: secret, onMount: node => node.focus() }),
        )
      },
    ),
    rowProblem(kit, removing),
  ]
}

export const valuesSection = (kit: Kit, model: LoginsModel, login: Derive<Login>) => {
  const change: Change = patch => model.change(login.get().id, patch)
  if (login.get().kind === 'key') return kit.settingsSection({ title: 'Key' }, valueRow(kit, change))
  return kit.settingsSection({ title: 'Sign-in' }, credentialsRow(kit, change), ...totpRows(kit, login, change))
}
