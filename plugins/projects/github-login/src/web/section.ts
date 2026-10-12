import { callout, copyButton, derive, div, dynamicChild, itemRow, rowAction, secondaryAction, settingsSection, span, type Child } from '@sand/dom'
import type { GithubCli, GithubState } from '../contract'
import { githubTile } from './mark'
import type { GithubControl } from './state'

const reach = (pcs: number) => (pcs > 1 ? `Agents on all ${pcs} PCs` : 'Agents on this PC')

const usedBy = (state: GithubState) => [state.from && `From ${state.from}`, `${reach(state.pcs)} use this login for gh and git push`].filter(Boolean).join(' · ')

const row = (title: Child, detail: Child, ...controls: Child[]) => itemRow({}, githubTile(), title, detail, ...controls)

const signedInRow = (state: GithubState, control: GithubControl) =>
  row(state.login, usedBy(state), rowAction({ label: 'Sign out', danger: true, run: () => void control.run({ type: 'github.logout' }) }))

const signedOutRow = ({ gh }: GithubState, signIn: () => void) =>
  gh.installed
    ? row('GitHub', 'Sign in so agents on every PC can use gh and git push', secondaryAction({ size: 'sm', onClick: signIn }, 'Sign in'))
    : row('GitHub', 'Install gh on this PC to sign in here, or sign in on another PC')

const warningText = (gh: GithubCli) =>
  gh.installed
    ? `gh ${gh.version} on this PC can't attach screenshots to PRs. Update to 2.99 or newer.`
    : "gh isn't installed on this PC, so agents here can't run gh."

const warning = (gh: GithubCli) => {
  const { command } = gh
  if (!command) return null
  return callout(
    'warning',
    div(
      { class: 'flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2' },
      span({ class: 'min-w-48 flex-1' }, warningText(gh)),
      span({ class: 'font-mono text-neutral-300' }, command),
      copyButton({ text: () => command, label: 'Copy' }),
    ),
  )
}

const view = (state: GithubState, control: GithubControl, signIn: () => void) =>
  div(
    { class: 'flex flex-col gap-2' },
    settingsSection({ title: 'GitHub' }, state.login ? signedInRow(state, control) : signedOutRow(state, signIn)),
    warning(state.gh),
  )

export const githubSection = (control: GithubControl, signIn: () => void) => {
  void control.load()
  return dynamicChild(
    derive(() => {
      const state = control.state.get()
      return state ? JSON.stringify([state.login, state.from, state.pcs, state.gh]) : ''
    }),
    () => {
      const state = control.state.get()
      return state ? view(state, control, signIn) : null
    },
  )
}
