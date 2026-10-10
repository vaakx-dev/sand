import { collectScope, onInterval, onRaf, onTimeout } from '@sand/dom'

export const after = (ms: number, run: () => void) => collectScope(() => onTimeout(run, ms)).value

export const every = (ms: number, run: () => void) => collectScope(() => onInterval(run, ms)).value

export const nextFrame = (run: () => void) => collectScope(() => onRaf(run)).value
