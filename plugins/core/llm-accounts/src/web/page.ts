import { div, dynamicChild, icon, p, pageHead, primaryAction } from '@sand/dom'
import type { AddAccount } from './add/sheet'
import { stepFor } from './add/steps'
import { localSection } from './local'
import { remoteSection } from './remote'
import type { LoginControl } from './state'

const sections = (control: LoginControl, add: AddAccount) =>
  div(
    { class: 'flex flex-col gap-6' },
    pageHead('Every account this PC can use, wherever it lives.', primaryAction({ onClick: () => add.open() }, icon('plus', 14), 'Add account')),
    localSection(control, account => add.open(stepFor(account))),
    remoteSection(control),
  )

export const accountsPage = (control: LoginControl, add: AddAccount) => {
  void control.load()
  return dynamicChild(control.unavailable, message => (message ? p({ class: 'text-xs wrap-anywhere text-danger-400' }, message) : sections(control, add)))
}
