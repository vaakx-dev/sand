import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { chooseStep } from '../add/choose'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'
import { nextAction } from './next'

const signedInKey = (control: LoginControl) => derive(() => JSON.stringify(control.state.get()?.accounts.map(account => [account.id, account.signedIn]) ?? []))

const elsewhere = ({ icon, listRow, settingsSection }: Kit, model: WelcomeModel) =>
  settingsSection(
    { title: 'Elsewhere' },
    listRow({ surface: 'group', lead: icon('link'), title: 'I use sand on another PC', meta: 'Connect to it and use its accounts', onClick: () => model.go('join') }),
  )

export const startView = (kit: Kit, model: WelcomeModel, control: LoginControl) => {
  const { quietButton, setupColumn, setupFooter, setupHeading, setupNote, setupScreen } = kit
  return setupScreen(
    setupHeading('Welcome to sand'),
    setupNote('Sign in to the AI you want to use.'),
    setupColumn(
      dynamicChild(signedInKey(control), () => chooseStep(kit, control.state.get(), model.pick)),
      elsewhere(kit, model),
    ),
    dynamicChild(model.connected, connected =>
      connected ? setupFooter(quietButton({ onClick: model.finish }, 'Skip for now'), nextAction(kit, model)) : quietButton({ size: 'sm', onClick: model.finish }, 'Skip for now'),
    ),
  )
}

export const addView = (kit: Kit, model: WelcomeModel) => {
  const { quietButton, setupColumn, setupHeading, setupScreen } = kit
  return setupScreen(
    setupHeading(() => model.add.title.get()),
    setupColumn(
      div({ class: 'flex flex-col overflow-hidden rounded-xl bg-neutral-800 pt-3' }, model.add.view(kit)),
      div({ class: 'flex' }, quietButton({ onClick: model.back }, 'Back')),
    ),
  )
}
