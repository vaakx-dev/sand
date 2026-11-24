import type { Kit } from '@sand/ui-kit/contract'
import { show, sig, type Derive } from '@vaakx-dev/vrui'
import type { Login } from '../../contract'
import { task } from '../task'
import { managers } from './managers/catalog'
import type { LoginPatch, LoginsModel } from './model'
import { editForm, formRow, rowProblem } from './parts'

type Change = (patch: LoginPatch) => Promise<unknown>

const credentialsRow = (kit: Kit, change: Change) =>
  formRow(kit, { title: 'Username and password', open: 'Replace' }, close => {
    const username = sig('')
    const password = sig('')
    return editForm(
      kit,
      { save: 'Replace', ready: () => Boolean(username.get() && password.get()), submit: () => change({ username: username.get(), password: password.get() }), done: close, cancel: close },
      kit.field({ label: 'Username or email' }, kit.textInput({ type: 'text', autocomplete: 'username', bindValue: username, onMount: node => node.focus() })),
      kit.field({ label: 'Password' }, kit.textInput({ type: 'password', autocomplete: 'new-password', bindValue: password })),
    )
  })

const valueRow = (kit: Kit, change: Change) =>
  formRow(kit, { title: 'Value', open: 'Replace' }, close => {
    const value = sig('')
    return editForm(
      kit,
      { save: 'Replace', ready: () => Boolean(value.get()), submit: () => change({ value: value.get() }), done: close, cancel: close },
      kit.field({ label: 'New value' }, kit.textInput({ type: 'password', bindValue: value, onMount: node => node.focus() })),
    )
  })

const totpRows = (kit: Kit, login: Derive<Login>, change: Change) => {
  const removing = task()
  const set = () => login.get().totp
  const remove = () =>
    kit.quietButton({ size: 'sm', disabled: removing.busy, onClick: () => void removing.run(() => change({ totp: null })) }, 'Remove')
  return [
    formRow(
      kit,
      {
        title: 'Authenticator',
        detail: () => (set() ? 'Set' : 'Not set'),
        open: () => (set() ? 'Replace' : 'Add'),
        extra: () => show(set, remove),
      },
      close => {
        const secret = sig('')
        return editForm(
          kit,
          { save: 'Save', ready: () => Boolean(secret.get().trim()), submit: () => change({ totp: secret.get().trim() }), done: close, cancel: close },
          kit.field({ label: 'Setup key or otpauth:// link' }, kit.textInput({ type: 'password', bindValue: secret, onMount: node => node.focus() })),
        )
      },
    ),
    rowProblem(kit, removing),
  ]
}

const keptSection = ({ settingsRow, settingsSection }: Kit, { kind, totp }: Login, manager: string) =>
  kind === 'key'
    ? settingsSection({ title: 'Key' }, settingsRow({ title: 'Value', detail: `In ${manager}` }))
    : settingsSection(
        { title: 'Sign-in' },
        settingsRow({ title: 'Username and password', detail: `In ${manager}` }),
        totp ? settingsRow({ title: 'Authenticator', detail: `In ${manager}` }) : null,
      )

export const valuesSection = (kit: Kit, model: LoginsModel, login: Derive<Login>) => {
  const { source } = login.get()
  if (source !== 'sand') return keptSection(kit, login.get(), managers[source].name)
  const change: Change = patch => model.change(login.get().id, patch)
  if (login.get().kind === 'key') return kit.settingsSection({ title: 'Key' }, valueRow(kit, change))
  return kit.settingsSection({ title: 'Sign-in' }, credentialsRow(kit, change), ...totpRows(kit, login, change))
}
