import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { AddAccount } from './add/sheet'
import { stepFor } from './add/steps'
import { localSection } from './local'
import { remoteSection } from './remote'
import type { LoginControl } from './state'

const sections = (kit: Kit, control: LoginControl, add: AddAccount) =>
  div(
    { class: 'flex flex-col gap-6' },
    localSection(kit, control, () => add.open(), account => add.open(stepFor(account))),
    remoteSection(kit, control),
  )

export const accountsPage = (kit: Kit, control: LoginControl, add: AddAccount) => {
  const { errorState } = kit
  void control.load()
  return dynamicChild(control.unavailable, message =>
    message ? errorState({ text: `Couldn't load your accounts: ${message}`, retry: () => void control.load() }) : sections(kit, control, add),
  )
}
