import type { Kit } from '@sand/ui-kit/contract'
import type { Screen } from '@sand/ui-shell/contract'
import { div } from '@vaakx-dev/vrui'

export const homeScreen = ({ appIcon, secondaryAction, setupHeading }: Kit, create: () => void): Screen => ({
  head: () => null,
  main: () =>
    div(
      { class: 'flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-5 text-center' },
      appIcon(48),
      setupHeading('Sand'),
      secondaryAction({ onClick: create }, 'New chat'),
    ),
})
