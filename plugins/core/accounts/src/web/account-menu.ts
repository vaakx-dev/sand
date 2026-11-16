import type { MenuAction } from '@sand/ui-shell/contract'
import type { MenuSpec } from '@sand/ui-kit/contract'
import { loginLogout, loginShared, type LoginAccount } from '../contract'
import { removeLabel } from './names'
import type { LoginControl } from './state'

export interface RowActions {
  fix(account: LoginAccount): void
  rename(account: LoginAccount): void
}

const shareAction = (account: LoginAccount, control: LoginControl): MenuAction[] =>
  account.app
    ? []
    : [
        {
          id: 'share',
          group: 'use',
          label: 'Share with my PCs',
          icon: 'monitor',
          active: account.shared,
          run: () => control.run(loginShared, { account: account.id, shared: !account.shared }),
        },
      ]

const renameAction = (account: LoginAccount, { rename }: RowActions): MenuAction[] =>
  account.added ? [{ id: 'rename', group: 'use', label: 'Rename', icon: 'pencil', run: () => rename(account) }] : []

export const removeAction = (account: LoginAccount, control: LoginControl): MenuAction => {
  const label = removeLabel(account)
  return {
    id: 'remove',
    group: 'danger',
    label,
    icon: 'trash',
    danger: true,
    confirm: account.kind === 'server' || account.added ? `Remove ${account.label}?` : `${label}?`,
    run: () => control.send(loginLogout, { account: account.id }),
  }
}

export const accountSpec = (account: LoginAccount, control: LoginControl, actions: RowActions): MenuSpec | undefined => {
  if (account.env) return undefined
  const server = account.kind === 'server'
  return {
    title: account.label,
    subtitle: account.email ?? account.url,
    actions: [
      ...shareAction(account, control),
      ...renameAction(account, actions),
      { id: 'fix', group: 'use', label: server ? 'Edit' : 'Sign in again', icon: server ? 'pencil' : 'key', run: () => actions.fix(account) },
      removeAction(account, control),
    ],
  }
}
