import type { Kit } from '@sand/ui-kit/contract'
import { show, type Child } from '@vaakx-dev/vrui'

const setupSteps = 2

export const screen = ({ progressSteps, setupScreen }: Kit, reached: number, ...children: Child[]) => setupScreen(progressSteps(setupSteps, reached), ...children)

export const problem = ({ errorText }: Kit, text: () => string) => show(() => !!text(), () => errorText(text))
