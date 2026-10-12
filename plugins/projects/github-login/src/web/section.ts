import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, span, type Child } from '@vaakx-dev/vrui'
import type { GithubCli, GithubState } from '../contract'
import { githubTile } from './mark'
import type { GithubControl } from './state'

const reach = (pcs: number) => (pcs > 1 ? `Agents on all ${pcs} PCs` : 'Agents on this PC')

const usedBy = (state: GithubState) => [state.from && `From ${state.from}`, `${reach(state.pcs)} use this login for gh and git push`].filter(Boolean).join(' · ')

const row = (kit: Kit, title: Child, detail: Child, ...controls: Child[]) => {
  const { itemRow } = kit
  return itemRow({}, githubTile(kit), title, detail, ...controls)
}

const signedInRow = (kit: Kit, state: GithubState, control: GithubControl) => {
  const { rowAction } = kit
  return row(kit, state.login, usedBy(state), rowAction({ label: 'Sign out', danger: true, run: () => void control.run({ type: 'github.logout' }) }))
}

const signedOutRow = (kit: Kit, { gh }: GithubState, signIn: () => void) => {
  const { secondaryAction } = kit
  return gh.installed
    ? row(kit, 'GitHub', 'Sign in so agents on every PC can use gh and git push', secondaryAction({ size: 'sm', onClick: signIn }, 'Sign in'))
    : row(kit, 'GitHub', 'Install gh on this PC to sign in here, or sign in on another PC')
}

const warningText = (gh: GithubCli) =>
  gh.installed
    ? `gh ${gh.version} on this PC can't attach screenshots to PRs. Update to 2.99 or newer.`
    : "gh isn't installed on this PC, so agents here can't run gh."

const warning = (kit: Kit, gh: GithubCli) => {
  const { callout, copyButton } = kit
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

const view = (kit: Kit, state: GithubState, control: GithubControl, signIn: () => void) => {
  const { settingsSection } = kit
  return div(
    { class: 'flex flex-col gap-2' },
    settingsSection({ title: 'GitHub' }, state.login ? signedInRow(kit, state, control) : signedOutRow(kit, state, signIn)),
    warning(kit, state.gh),
  )
}

export const githubSection = (kit: Kit, control: GithubControl, signIn: () => void) => {
  void control.load()
  return dynamicChild(
    derive(() => {
      const state = control.state.get()
      return state ? JSON.stringify([state.login, state.from, state.pcs, state.gh]) : ''
    }),
    () => {
      const state = control.state.get()
      return state ? view(kit, state, control, signIn) : null
    },
  )
}
