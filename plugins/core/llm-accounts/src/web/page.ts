import { div, dynamicChild, errorText, icon, pageHead, secondaryAction } from '@sand/dom'
import type { AddAccount } from './add/sheet'
import { stepFor } from './add/steps'
import { localSection } from './local'
import { remoteSection } from './remote'
import type { LoginControl } from './state'

const sections = (control: LoginControl, add: AddAccount) =>
  div(
    { class: 'flex flex-col gap-6' },
    pageHead('Every account this PC can use, wherever it lives.', secondaryAction({ size: 'sm', onClick: () => add.open() }, icon('plus', 14), 'Add an account')),
    localSection(control, account => add.open(stepFor(account))),
    remoteSection(control),
  )

export const accountsPage = (control: LoginControl, add: AddAccount) => {
  void control.load()
  return dynamicChild(control.unavailable, message => (message ? errorText(message) : sections(control, add)))
}
