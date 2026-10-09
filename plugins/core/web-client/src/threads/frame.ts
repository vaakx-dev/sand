import { collectScope, onRaf } from '@sand/dom'

export const nextFrame = (run: () => void) => collectScope(() => onRaf(run)).value
