import { settings } from '@sand/settings/contract'
import type { Page } from './page'

export const accountsButton = (page: Page, label: string) => {
  const open = page.ctx.get(settings)
  return open ? page.ctx.kit.secondaryAction({ size: 'sm', onClick: () => open.open('accounts') }, label) : undefined
}
