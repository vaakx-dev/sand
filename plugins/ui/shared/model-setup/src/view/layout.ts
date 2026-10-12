import { errorText, progressSteps, setupScreen, show, type Child } from '@sand/dom'

const setupSteps = 3

export const screen = (reached: number, ...children: Child[]) => setupScreen(progressSteps(setupSteps, reached), ...children)

export const problem = (text: () => string) => show(() => !!text(), () => errorText(text))
