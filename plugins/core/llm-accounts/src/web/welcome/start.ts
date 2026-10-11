import { choiceButton, choiceList, derive, div, dynamicChild, groupLabel, icon, quietButton, setupColumn, setupFooter, setupHeading, setupNote, setupScreen, tile } from '@sand/dom'
import { chooseStep } from '../add/choose'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'
import { nextAction } from './next'

const signedInKey = (control: LoginControl) => derive(() => JSON.stringify(control.state.get()?.accounts.map(account => [account.id, account.signedIn]) ?? []))

const elsewhere = (model: WelcomeModel) =>
  div(
    { class: 'flex flex-col' },
    groupLabel('Elsewhere'),
    choiceList(choiceButton({ mark: tile(icon('link', 16)), title: 'I use sand on another PC', detail: 'Connect to it and use its accounts', onClick: () => model.go('join') })),
  )

export const startView = (model: WelcomeModel, control: LoginControl) =>
  setupScreen(
    setupHeading('Welcome to sand'),
    setupNote('Sign in to the AI you want to use.'),
    setupColumn(
      dynamicChild(signedInKey(control), () => chooseStep(control.state.get(), model.pick)),
      elsewhere(model),
    ),
    dynamicChild(model.connected, connected =>
      connected ? setupFooter(quietButton({ onClick: model.finish }, 'Skip for now'), nextAction(model)) : quietButton({ size: 'sm', onClick: model.finish }, 'Skip for now'),
    ),
  )

export const addView = (model: WelcomeModel) =>
  setupScreen(setupHeading(() => model.add.title.get()), setupColumn(model.add.view(), div({ class: 'flex' }, quietButton({ onClick: model.back }, 'Back'))))
