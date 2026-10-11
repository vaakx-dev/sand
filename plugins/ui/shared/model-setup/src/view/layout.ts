import { p, progressSteps, setupScreen, type Child } from '@sand/dom'

const setupSteps = 3

export const screen = (reached: number, ...children: Child[]) => setupScreen(progressSteps(setupSteps, reached), ...children)

export const problem = (text: () => string) => p({ class: 'text-xs wrap-anywhere text-danger-400', hidden: () => !text() }, text)
