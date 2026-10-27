import type { Kit } from '@sand/ui-kit/contract'
import { derive, dynamicChild } from '@vaakx-dev/vrui'
import type { LoginAccount, LoginState } from '../../contract'
import { accountLogo, howText } from '../names'
import { remoteRow } from '../remote'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'
import { nextAction } from './next'

const localRow = (kit: Kit, account: LoginAccount) =>
  kit.settingsRow({ lead: accountLogo(kit, account.provider), title: account.label, detail: `${howText(account)} · on this PC` })

const accounts = (kit: Kit, state: LoginState) => {
  const { settingsSection } = kit
  return settingsSection(
    {},
    state.accounts.filter(account => account.signedIn).map(account => localRow(kit, account)),
    state.remote.map(account => remoteRow(kit, state, account)),
  )
}

export const connectedView = (kit: Kit, model: WelcomeModel, control: LoginControl) => {
  const { doneMark, secondaryAction, setupColumn, setupFooter, setupHeading, setupScreen } = kit
  return setupScreen(
    doneMark(),
    setupHeading('Your accounts are connected'),
    setupColumn(
      dynamicChild(
        derive(() => JSON.stringify(control.state.get() ?? null)),
        () => {
          const state = control.state.get()
          return state ? accounts(kit, state) : null
        },
      ),
    ),
    setupFooter(secondaryAction({ onClick: () => model.go('start') }, 'Add another'), nextAction(kit, model)),
  )
}
