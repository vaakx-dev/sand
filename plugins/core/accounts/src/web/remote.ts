import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild } from '@vaakx-dev/vrui'
import type { LoginRemoteAccount, LoginState } from '../contract'
import { accountLogo, howText, presence } from './names'
import type { LoginControl } from './state'

const ownHere = (state: LoginState, account: LoginRemoteAccount) =>
  account.kind !== 'server' && state.accounts.some(local => local.id === account.id && local.signedIn)

const signInOf = (state: LoginState, account: LoginRemoteAccount) => state.accounts.find(local => local.id === account.id)?.signIn

const detail = (state: LoginState, account: LoginRemoteAccount) =>
  [howText({ ...account, signIn: signInOf(state, account) }), `on ${account.pc}`, ownHere(state, account) && 'this PC uses its own'].filter(Boolean).join(' · ')

export const remoteRow = (kit: Kit, state: LoginState, account: LoginRemoteAccount) => {
  const { settingsRow } = kit
  return settingsRow({ lead: accountLogo(kit, account.provider), title: account.label, detail: detail(state, account) }, presence(kit, account.online))
}

const problems = (state: LoginState) => state.pcs.flatMap(pc => (pc.error && !pc.shares.length ? [pc.error] : []))

export const remoteSection = (kit: Kit, control: LoginControl) => {
  const { errorState, settingsSection } = kit
  return dynamicChild(
    derive(() => {
      const state = control.state.get()
      if (!state || (!state.remote.length && !problems(state).length)) return ''
      return JSON.stringify([state.remote, state.accounts.map(account => [account.id, account.signedIn]), problems(state)])
    }),
    key => {
      const state = control.state.get()
      if (!key || !state) return null
      return settingsSection(
        { title: 'From your PCs' },
        state.remote.map(account => remoteRow(kit, state, account)),
        problems(state).map(problem => errorState({ surface: 'group', text: problem })),
      )
    },
  )
}
