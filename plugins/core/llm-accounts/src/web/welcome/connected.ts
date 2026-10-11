import { badge, derive, doneMark, dynamicChild, itemRow, secondaryAction, settingsSection, setupColumn, setupFooter, setupHeading, setupScreen } from '@sand/dom'
import type { LoginAccount, LoginState } from '../../contract'
import { accountLogo, howText } from '../names'
import { remoteRow } from '../remote'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'
import { nextAction } from './next'

const localRow = (account: LoginAccount) => itemRow({}, accountLogo(account.provider), account.label, howText(account), badge('success', 'On this PC'))

const accounts = (state: LoginState) =>
  settingsSection(
    {},
    state.accounts.filter(account => account.signedIn).map(localRow),
    state.remote.map(account => remoteRow(state, account)),
  )

export const connectedView = (model: WelcomeModel, control: LoginControl) =>
  setupScreen(
    doneMark(),
    setupHeading('Your accounts are connected'),
    setupColumn(
      dynamicChild(
        derive(() => JSON.stringify(control.state.get() ?? null)),
        () => {
          const state = control.state.get()
          return state ? accounts(state) : null
        },
      ),
    ),
    setupFooter(secondaryAction({ onClick: () => model.go('start') }, 'Add another'), nextAction(model)),
  )
