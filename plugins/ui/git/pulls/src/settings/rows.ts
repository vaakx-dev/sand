import type { GitHubAuth } from '@sand/github/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { type Child, div, dynamicChild, show } from '@vaakx-dev/vrui'
import type { GitHubSignIn } from './github'

export interface PcView {
  name: () => string
  online: boolean
  auth?: GitHubAuth
  signIn: GitHubSignIn
}

type SignedIn = Extract<GitHubAuth, { state: 'signed-in' }>

const ghSite = 'https://cli.github.com'

const signedInDetail = (auth: SignedIn) => {
  const source = auth.from === 'gh' ? 'gh' : 'GITHUB_TOKEN'
  const host = auth.host === 'github.com' ? '' : ` at ${auth.host}`
  return `Signed in as ${auth.login}${host} (${source})`
}

const messages = (kit: Kit, signIn: GitHubSignIn): Child[] => [
  show(signIn.note.map(Boolean), () => kit.rowDetail(kit.sheetText(() => signIn.note.get()))),
  show(signIn.failure.map(Boolean), () => kit.rowDetail(kit.errorText(() => signIn.failure.get()))),
]

const codeStep = (kit: Kit, signIn: GitHubSignIn) =>
  kit.rowDetail(
    dynamicChild(signIn.code, found =>
      found
        ? div(
            { class: 'flex flex-col gap-2' },
            kit.sheetText('Enter this code on GitHub to finish signing in:'),
            kit.deviceCode(found.code),
            div(kit.linkButton({ onClick: () => kit.openTab(found.url) }, `Open ${found.url}`)),
          )
        : null,
    ),
    kit.waitingLine('Waiting for GitHub…'),
  )

const signedInRows = (kit: Kit, { name, signIn }: PcView, auth: SignedIn) => [
  kit.settingsRow(
    { title: name, detail: signedInDetail(auth) },
    kit.secondaryAction({ size: 'sm', disabled: signIn.leaving, onClick: () => void signIn.logout() }, 'Sign out'),
  ),
]

const signInRows = (kit: Kit, { name, signIn }: PcView) => [
  kit.settingsRow(
    { title: name, detail: 'Not signed in. Sand uses the GitHub CLI (gh) to open, merge and watch pull requests.' },
    kit.primaryAction({ size: 'sm', disabled: signIn.signing, onClick: () => void signIn.login() }, 'Sign in with GitHub'),
  ),
  show(signIn.signing, () => codeStep(kit, signIn)),
]

const installRows = (kit: Kit, { name, signIn }: PcView) => [
  kit.settingsRow(
    { title: name, detail: "The GitHub CLI (gh) isn't installed on this PC." },
    kit.quietButton({ size: 'sm', surface: 'group', onClick: () => void signIn.check() }, 'Check again'),
  ),
  kit.rowDetail(
    kit.sheetText('Install gh from cli.github.com, then come back here to sign in. Sand can also use a GITHUB_TOKEN set where sand runs.'),
    div(kit.linkButton({ onClick: () => kit.openTab(ghSite) }, 'Open cli.github.com')),
  ),
]

const authRows = (kit: Kit, view: PcView): Child[] => {
  const { name, auth, signIn } = view
  if (!auth) return [kit.settingsRow({ title: name, detail: 'Checking…' })]
  if (auth.state === 'signed-in') return signedInRows(kit, view, auth)
  if (auth.state === 'error')
    return [kit.settingsRow({ title: name, detail: kit.errorText(auth.message) }, kit.secondaryAction({ size: 'sm', onClick: () => void signIn.check() }, 'Retry'))]
  return auth.gh ? signInRows(kit, view) : installRows(kit, view)
}

export const pcRows = (kit: Kit, view: PcView): Child[] => {
  if (!view.online) return [kit.settingsRow({ title: view.name, detail: 'Offline. Its GitHub sign-in shows once it reconnects.' })]
  return [...authRows(kit, view), ...messages(kit, view.signIn)]
}
