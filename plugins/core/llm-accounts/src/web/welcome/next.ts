import { primaryAction } from '@sand/dom'
import type { WelcomeModel } from './model'

export const nextAction = (model: WelcomeModel) => primaryAction({ onClick: model.next }, () => (model.setup.get() ? 'Next: pick models' : 'Start a thread'))
