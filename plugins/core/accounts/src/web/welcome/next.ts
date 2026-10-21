import type { Kit } from '@sand/ui-kit/contract'
import type { WelcomeModel } from './model'

export const nextAction = ({ primaryAction }: Kit, model: WelcomeModel) => primaryAction({ onClick: model.next }, () => (model.setup.get() ? 'Next: pick models' : 'Start chatting'))
