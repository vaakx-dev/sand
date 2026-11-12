import type { MenuAction } from '@sand/ui-shell/contract'
import type { MenuSpec } from '@sand/ui-kit/contract'
import { loginLogout, loginShared, type LoginAccount } from '../contract'
import { removeLabel } from './names'
import type { LoginControl } from './state'

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

export const removeAction = (account: LoginAccount, control: LoginControl): MenuAction => {
  const label = removeLabel(account)
  return {
    id: 'remove',
    group: 'danger',
    label,
    icon: 'trash',
    danger: true,
    confirm: account.kind === 'server' ? `Remove ${account.label}?` : `${label}?`,
    run: () => control.send(loginLogout, { account: account.id }),
  }
}

export const accountSpec = (account: LoginAccount, control: LoginControl, fix: (account: LoginAccount) => void): MenuSpec | undefined => {
  if (account.env) return undefined
  const server = account.kind === 'server'
  return {
    title: account.label,
    subtitle: account.email ?? account.url,
    actions: [
      ...shareAction(account, control),
      { id: 'fix', group: 'use', label: server ? 'Edit' : 'Sign in again', icon: server ? 'pencil' : 'key', run: () => fix(account) },
      removeAction(account, control),
    ],
  }
}
