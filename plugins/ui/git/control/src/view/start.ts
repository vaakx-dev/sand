import type { ControlParts } from '../parts'

export const startButton = ({ kit, actions }: ControlParts) =>
  kit.secondaryAction({ size: 'sm', onClick: () => void actions.init() }, kit.icon('plus', 14), 'Start a git repo')
