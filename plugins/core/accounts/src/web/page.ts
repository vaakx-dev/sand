import type { Kit } from '@sand/ui-kit/contract'
import { div, dynamicChild } from '@vaakx-dev/vrui'
import type { AddAccount } from './add/sheet'
import { stepFor } from './add/steps'
import { localSection } from './local'
import { remoteSection } from './remote'
import type { LoginControl } from './state'

const sections = (kit: Kit, control: LoginControl, add: AddAccount) => {
  const { icon, pageHead, secondaryAction } = kit
  return div(
    { class: 'flex flex-col gap-6' },
    pageHead('Every account this PC can use, wherever it lives.', secondaryAction({ size: 'sm', onClick: () => add.open() }, icon('plus', 14), 'Add an account')),
    localSection(kit, control, account => add.open(stepFor(account))),
    remoteSection(kit, control),
  )
}

export const accountsPage = (kit: Kit, control: LoginControl, add: AddAccount) => {
  const { errorText } = kit
  void control.load()
  return dynamicChild(control.unavailable, message => (message ? errorText(message) : sections(kit, control, add)))
}
