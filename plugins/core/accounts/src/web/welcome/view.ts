import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, show } from '@vaakx-dev/vrui'
import type { LoginControl } from '../state'
import type { WelcomeModel } from './model'
import { addView, startView } from './start'

export const welcomeView = (kit: Kit, model: WelcomeModel, control: LoginControl) =>
  show(model.active, () => kit.setupFrame(dynamicChild(model.step, step => (step === 'add' ? addView(kit, model) : startView(kit, model, control)))))
