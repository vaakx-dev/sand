import type { ToastAction } from '@sand/toasts/contract'
import type { Kit } from '@sand/ui-kit/contract'

export const githubAction = (kit: Kit, url: string): ToastAction => ({ label: 'Open on GitHub', run: () => kit.openTab(url) })
