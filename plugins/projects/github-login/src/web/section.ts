import { copyButton, derive, div, dynamicChild, icon, rowAction, secondaryAction, settingsSection, span, type Child } from '@sand/dom'
import type { GithubCli, GithubState } from '../contract'
import { githubTile } from './mark'
import type { GithubControl } from './state'

const reach = (pcs: number) => (pcs > 1 ? `Agents on all ${pcs} PCs` : 'Agents on this PC')

const usedBy = (state: GithubState) => [state.from && `From ${state.from}`, `${reach(state.pcs)} use this login for gh and git push`].filter(Boolean).join(' · ')

const row = (title: Child, detail: Child, ...controls: Child[]) =>
  div(
    { class: 'flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 bg-neutral-900 px-4 py-3' },
    githubTile(),
    div(
      { class: 'flex min-w-32 flex-1 flex-col' },
      span({ class: 'truncate text-sm font-medium text-neutral-100' }, title),
      span({ class: 'text-xs text-neutral-500' }, detail),
    ),
    ...controls,
  )

const signedInRow = (state: GithubState, control: GithubControl) =>
  row(state.login, usedBy(state), rowAction({ label: 'Sign out', danger: true, run: () => void control.run({ type: 'github.logout' }) }))

const signedOutRow = (state: GithubState, signIn: () => void) =>
  row(
    'GitHub',
    state.gh.installed ? 'Sign in so agents on every PC can use gh and git push' : 'Install gh on this PC to sign in here, or sign in on another PC',
    state.gh.installed ? secondaryAction({ size: 'sm', onClick: signIn }, 'Sign in') : null,
  )

const warningText = (gh: GithubCli) =>
  gh.installed
    ? `gh ${gh.version} on this PC can't attach screenshots to PRs. Update to 2.99 or newer.`
    : "gh isn't installed on this PC, so agents here can't run gh."

const warning = (gh: GithubCli) =>
  gh.command
    ? div(
        { class: 'flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-warning-950 px-4 py-2 text-xs text-warning-400' },
        icon('alert', 14),
        span({ class: 'min-w-48 flex-1' }, warningText(gh)),
        span({ class: 'font-mono text-neutral-300' }, gh.command),
        copyButton({ text: () => gh.command ?? '', label: gh.installed ? 'Copy update command' : 'Copy install command' }),
      )
    : null

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
    key => {
      const state = control.state.get()
      return key && state ? view(state, control, signIn) : div({ class: 'hidden' })
    },
  )
}
