import type { Kit } from '@sand/ui-kit/contract'
import { dynamicChild, show, type Child, type Derive } from '@vaakx-dev/vrui'

export const screen = ({ progressSteps, setupScreen }: Kit, total: Derive<number>, reached: number, ...children: Child[]) =>
  setupScreen(
    dynamicChild(total, count => progressSteps(count, reached)),
    ...children,
  )

export const problem = ({ errorText }: Kit, text: () => string) => show(() => !!text(), () => errorText(text))
