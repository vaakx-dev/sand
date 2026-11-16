import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { RowActions } from './account-menu'
import type { AddAccount } from './add/sheet'
import { localSection } from './local'
import type { PlanSheets } from './plan'
import { remoteSection } from './remote'
import type { LoginControl } from './state'

interface PageParts {
  control: LoginControl
  add: AddAccount
  actions: RowActions
  plans: PlanSheets
}

const sections = (kit: Kit, { control, add, actions, plans }: PageParts) =>
  div({ class: 'flex flex-col gap-6' }, localSection(kit, { control, actions, plans, add: () => add.open() }), remoteSection(kit, control))

export const accountsPage = (kit: Kit, parts: PageParts) => {
  const { errorState } = kit
  const { control } = parts
  void control.load()
  return dynamicChild(control.unavailable, message =>
    message ? errorState({ text: `Couldn't load your accounts: ${message}`, retry: () => void control.load() }) : sections(kit, parts),
  )
}
