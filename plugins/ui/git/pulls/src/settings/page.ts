import type { PcView } from '@sand/devices-contract'
import type { GitHubAuth } from '@sand/github/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { type Derive, derive, div, dynamicChild, type Sig } from '@vaakx-dev/vrui'
import type { GitHubSignIns } from './github'
import { pcRows } from './rows'

type PcState = GitHubAuth | 'checking' | 'offline'

const pcRow = (kit: Kit, signIns: GitHubSignIns, machine: Sig<PcView>) => {
  const signIn = signIns.of(machine.get().id)
  if (machine.get().online) void signIn.check()
  const name = derive(() => machine.get().name)
  const state = derive((): PcState => (machine.get().online ? (signIn.auth() ?? 'checking') : 'offline'))
  return dynamicChild(state, found =>
    div(
      { class: 'contents' },
      ...pcRows(kit, {
        name: () => name.get(),
        online: found !== 'offline',
        auth: typeof found === 'string' ? undefined : found,
        signIn,
      }),
    ),
  )
}

export const gitSettingsPage = (kit: Kit, pcs: Derive<PcView[]>, signIns: GitHubSignIns) =>
  div(
    { class: 'flex flex-col gap-6' },
    kit.settingsSection(
      { title: 'GitHub' },
      kit.rowList(
        pcs,
        machine => machine.id,
        machine => pcRow(kit, signIns, machine),
      ),
    ),
  )
