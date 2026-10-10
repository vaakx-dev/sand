import type { MenuSpec } from '@sand/dom'
import type { LoginAccount } from '../contract'
import type { LoginControl } from './state'

export const accountSpec = (account: LoginAccount, control: LoginControl, fix: (account: LoginAccount) => void): MenuSpec | undefined => {
  if (account.env) return undefined
  const server = account.kind === 'server'
  return {
    title: account.label,
    subtitle: account.email ?? account.url,
    actions: [
      {
        id: 'share',
        group: 'use',
        label: 'Share with my PCs',
        icon: 'monitor',
        active: account.shared,
        run: () => control.run({ type: 'login.shared', account: account.id, shared: !account.shared }),
      },
      { id: 'fix', group: 'use', label: server ? 'Edit' : 'Sign in again', icon: server ? 'pencil' : 'key', run: () => fix(account) },
      {
        id: 'remove',
        group: 'danger',
        label: server ? 'Remove' : 'Sign out',
        icon: 'trash',
        danger: true,
        confirm: server ? `Remove ${account.label}?` : `Sign out of ${account.label}?`,
        run: () => control.run({ type: 'login.logout', account: account.id }),
      },
    ],
  }
}
