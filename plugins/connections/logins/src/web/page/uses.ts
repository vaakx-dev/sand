import type { Wire } from '@sand/devices-contract'
import type { Kit } from '@sand/ui-kit/contract'
import { ago, exactTime } from '@sand/util'
import { derive, resource, span, type Sig } from '@vaakx-dev/vrui'
import { loginUses, type Grant, type Use, type UseAction } from '../../contract'
import { loadedRows } from './parts'

const actions: Record<UseAction, string> = { fill: 'Signed in', code: 'Made a sign-in code', env: 'Used in a command' }

const grants: Record<Grant, string> = { bot: 'the bot may use it', thread: 'given to the thread', user: 'you allowed it' }

const detailOf = ({ action, site, grant }: Use) => `${actions[action]}${site ? ` on ${site}` : ''} · ${grants[grant]}`

const useRow = ({ icon, settingsRow }: Kit, use: Sig<Use>) =>
  settingsRow(
    {
      lead: span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(use.get().owner === 'bot' ? 'bot' : 'message', 'sm')),
      title: () => use.get().title,
      detail: () => detailOf(use.get()),
    },
    span({ class: 'text-xs text-neutral-500', title: () => exactTime(use.get().at) }, () => ago(use.get().at)),
  )

export const usesSection = (kit: Kit, wire: Wire, login: string) => {
  const uses = resource(() => wire.call(loginUses, { id: login }))
  const newest = derive(() => (uses.data.get() ?? []).toSorted((a, b) => b.at - a.at))
  return kit.settingsSection(
    { title: 'Used' },
    loadedRows(kit, uses, newest, 'Not used yet.', () =>
      kit.rowList(
        newest,
        use => `${use.at}:${use.conversation}:${use.action}`,
        use => useRow(kit, use),
      ),
    ),
  )
}
