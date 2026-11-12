import type { Kit } from '@sand/ui-kit/contract'
import { derive, div, dynamicChild } from '@vaakx-dev/vrui'
import { chooseStep } from '../add/choose'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'

const signedInKey = (control: LoginControl) => derive(() => JSON.stringify(control.state.get()?.accounts.map(account => [account.id, account.signedIn]) ?? []))

export const startView = (kit: Kit, model: WelcomeModel, control: LoginControl) => {
  const { quietButton, setupColumn, setupHeading, setupNote, setupScreen } = kit
  return setupScreen(
    setupHeading('Sign in to start'),
    setupNote('sand runs on the AI plan or key you already have.'),
    setupColumn(dynamicChild(signedInKey(control), () => chooseStep(kit, control.state.get(), model.pick, 'page'))),
    quietButton({ size: 'sm', onClick: model.skip }, 'Skip for now'),
  )
}

export const addView = (kit: Kit, model: WelcomeModel) => {
  const { quietButton, setupColumn, setupFooter, setupHeading, setupScreen } = kit
  return setupScreen(
    setupHeading(() => model.add.title.get()),
    setupColumn(div({ class: '-mx-4 flex flex-col' }, model.add.view(kit, 'page'))),
    setupFooter(quietButton({ onClick: model.back }, 'Back')),
  )
}
