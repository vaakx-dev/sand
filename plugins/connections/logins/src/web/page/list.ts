import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild, show, type Sig } from '@vaakx-dev/vrui'
import type { Login, LoginsState } from '../../contract'
import { addSection, type AddParts } from './add'
import { placeOf } from './managers/catalog'
import { managersSection } from './managers/section'
import { kindIcons } from './parts'

export interface ListParts extends AddParts {
  open(login: string): void
}

const counted = (count: number, one: string) => (count ? `${count} ${one}${count === 1 ? '' : 's'}` : '')

const summaryOf = (login: Login) => {
  const users = [counted(login.bots.length, 'bot'), counted(login.threads.length, 'thread')].filter(Boolean).join(', ')
  return [login.site ?? 'Key', `in ${placeOf(login.source)}`, users || 'No one can use it yet', login.ask ? 'asks every time' : ''].filter(Boolean).join(' · ')
}

export const storageNote = ({ sheetText }: Kit, state: Sig<LoginsState | undefined>) =>
  sheetText(() =>
    state.get()?.keychain
      ? 'Logins saved in sand are kept encrypted, with the key in the system keychain. Saved values are never shown again, only replaced.'
      : 'Logins saved in sand are kept encrypted, with the key in a key file in the sand home. Saved values are never shown again, only replaced.',
  )

const loginRow = ({ chevron, icon, listRow }: Kit, login: Sig<Login>, open: (id: string) => void) =>
  listRow({
    lead: icon(kindIcons[login.get().kind], 'sm'),
    title: () => login.get().name,
    meta: () => summaryOf(login.get()),
    trail: chevron(() => false),
    onClick: () => open(login.get().id),
  })

const content = (kit: Kit, parts: ListParts, state: Sig<LoginsState | undefined>) => {
  const { emptyState, rowList, settingsSection } = kit
  const logins = derive(() => (state.get()?.logins ?? []).toSorted((a, b) => a.name.localeCompare(b.name)))
  return div(
    { class: 'contents' },
    settingsSection(
      { title: 'Saved' },
      rowList(
        logins,
        login => login.id,
        login => loginRow(kit, login, parts.open),
      ),
      show(
        () => !logins.get().length,
        () => emptyState({ flush: true, text: 'None yet. Add a website login or a key below, or pick one from a password manager.' }),
      ),
    ),
    addSection(kit, parts),
    managersSection(kit, parts.model),
    storageNote(kit, state),
  )
}

export const listPage = (kit: Kit, parts: ListParts) =>
  div(
    { class: 'flex flex-col gap-6' },
    kit.pageHead('Website logins and keys your bots and threads can use. Agents sign in and run commands with them without ever seeing a password or key.'),
    dynamicChild(
      parts.model.state.map(value => value === undefined),
      loading => (loading ? kit.loadingState() : content(kit, parts, parts.model.state)),
    ),
  )
