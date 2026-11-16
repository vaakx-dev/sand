import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { LoginAccount } from '../contract'
import type { AddAccount } from './add/sheet'
import { stepFor } from './add/steps'
import { localSection } from './local'
import { remoteSection } from './remote'
import type { LoginControl } from './state'

interface PageParts {
  control: LoginControl
  add: AddAccount
  rename(account: LoginAccount): Promise<void>
}

const sections = (kit: Kit, { control, add, rename }: PageParts) =>
  div(
    { class: 'flex flex-col gap-6' },
    localSection(kit, control, () => add.open(), { fix: account => add.open(stepFor(account)), rename: account => void rename(account) }),
    remoteSection(kit, control),
  )

export const accountsPage = (kit: Kit, parts: PageParts) => {
  const { errorState } = kit
  const { control } = parts
  void control.load()
  return dynamicChild(control.unavailable, message =>
    message ? errorState({ text: `Couldn't load your accounts: ${message}`, retry: () => void control.load() }) : sections(kit, parts),
  )
}
