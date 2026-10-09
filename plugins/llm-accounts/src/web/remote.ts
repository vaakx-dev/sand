import { derive, div, dynamicChild, hint, settingsSection, span } from '@sand/dom'
import type { LoginRemoteAccount, LoginState } from '@sand/protocol'
import { accountLogo, accountTitle, howText, readyChip } from './names'
import { accountRow } from './parts'
import type { LoginControl } from './state'

const ownHere = (state: LoginState, account: LoginRemoteAccount) => state.accounts.some(local => local.provider === account.provider && local.signedIn)

const detail = (state: LoginState, account: LoginRemoteAccount) =>
  [howText(account), `on ${account.pc}`, ownHere(state, account) && 'this PC uses its own'].filter(Boolean).join(' · ')

export const remoteRow = (state: LoginState, account: LoginRemoteAccount) =>
  accountRow(accountLogo(account.provider), accountTitle(account), detail(state, account), readyChip(account.online))

const problems = (state: LoginState) => state.pcs.flatMap(pc => (pc.error && !pc.shares.length ? [pc.error] : []))

export const remoteSection = (control: LoginControl) =>
  dynamicChild(
    derive(() => {
      const state = control.state.get()
      if (!state || (!state.remote.length && !problems(state).length)) return ''
      return JSON.stringify([state.remote, state.accounts.map(account => account.signedIn), problems(state)])
    }),
    key => {
      const state = control.state.get()
      if (!key || !state) return div({ class: 'hidden' })
      return settingsSection(
        { title: 'From your other PCs' },
        span({ class: 'contents' }, state.remote.map(account => remoteRow(state, account))),
        span({ class: 'contents' }, problems(state).map(text => div({ class: 'bg-neutral-900' }, hint(text)))),
      )
    },
  )
