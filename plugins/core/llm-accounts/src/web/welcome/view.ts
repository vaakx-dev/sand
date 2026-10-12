import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, show } from '@vaakx-dev/vrui'
import type { LoginControl } from '../state'
import { connectedView } from './connected'
import { joinedView, joinView } from './join'
import type { WelcomeModel } from './model'
import { addView, startView } from './start'

const setupSteps = 3

const body = (kit: Kit, model: WelcomeModel, control: LoginControl) =>
  dynamicChild(model.step, step => {
    const pc = model.joined.get()
    if (step === 'joined' && pc) return joinedView(kit, model, control, pc)
    if (step === 'connected') return connectedView(kit, model, control)
    if (step === 'join') return joinView(kit, model)
    return step === 'add' ? addView(kit, model) : startView(kit, model, control)
  })

export const welcomeView = (kit: Kit, model: WelcomeModel, control: LoginControl) => {
  const { progressSteps, setupFrame, setupScreen } = kit
  return show(model.active, () =>
    setupFrame(
      setupScreen(
        show(model.setup.map(Boolean), () => progressSteps(setupSteps, 1)),
        body(kit, model, control),
      ),
    ),
  )
}
