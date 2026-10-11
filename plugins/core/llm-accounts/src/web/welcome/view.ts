import { dynamicChild, progressSteps, setupFrame, setupScreen, show } from '@sand/dom'
import type { LoginControl } from '../state'
import { connectedView } from './connected'
import { joinedView, joinView } from './join'
import type { WelcomeModel } from './model'
import { addView, startView } from './start'

const setupSteps = 3

const body = (model: WelcomeModel, control: LoginControl) =>
  dynamicChild(model.step, step => {
    const pc = model.joined.get()
    if (step === 'joined' && pc) return joinedView(model, control, pc)
    if (step === 'connected') return connectedView(model, control)
    if (step === 'join') return joinView(model)
    return step === 'add' ? addView(model) : startView(model, control)
  })

export const welcomeView = (model: WelcomeModel, control: LoginControl) =>
  show(model.active, () =>
    setupFrame(
      setupScreen(
        show(model.setup.map(Boolean), () => progressSteps(setupSteps, 1)),
        body(model, control),
      ),
    ),
  )
