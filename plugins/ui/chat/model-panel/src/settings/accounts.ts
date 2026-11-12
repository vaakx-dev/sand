import { settings } from '@sand/settings/contract'
import type { EmptyAction } from '@sand/ui-kit/contract'
import type { Page } from './page'

export const accountsAction = (page: Page, label: string): EmptyAction | undefined => {
  const open = page.ctx.get(settings)
  return open && { label, run: () => open.open('accounts') }
}
