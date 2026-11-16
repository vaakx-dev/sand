import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild } from '@vaakx-dev/vrui'
import type { LoginRemoteAccount, LoginState } from '../contract'
import { accountLogo, howText, presence } from './names'
import { onPlan } from './plan'
import type { LoginControl } from './state'

const ownHere = (state: LoginState, account: LoginRemoteAccount) =>
  account.kind !== 'server' && state.accounts.some(local => local.id === account.id && local.signedIn)

const detail = (state: LoginState, account: LoginRemoteAccount) =>
  [howText(account), `on ${account.pc}`, ownHere(state, account) && 'this PC uses its own'].filter(Boolean).join(' · ')

const remoteRow = (kit: Kit, state: LoginState, account: LoginRemoteAccount) => {
  const { settingsRow } = kit
  return settingsRow({ lead: accountLogo(kit, account.provider), title: account.label, detail: detail(state, account) }, presence(kit, account.online))
}

const keysAndServers = (state: LoginState) => state.remote.filter(account => !onPlan(account))

const problems = (state: LoginState) => state.pcs.flatMap(pc => (pc.error && !pc.shares.length ? [pc.error] : []))

export const remoteSection = (kit: Kit, control: LoginControl) => {
  const { errorState, settingsSection } = kit
  return dynamicChild(
    derive(() => {
      const state = control.state.get()
      if (!state || (!keysAndServers(state).length && !problems(state).length)) return ''
      return JSON.stringify([keysAndServers(state), state.accounts.map(account => [account.id, account.signedIn]), problems(state)])
    }),
    key => {
      const state = control.state.get()
      if (!key || !state) return null
      return settingsSection(
        { title: 'From your PCs' },
        keysAndServers(state).map(account => remoteRow(kit, state, account)),
        problems(state).map(problem => errorState({ text: problem })),
      )
    },
  )
}
