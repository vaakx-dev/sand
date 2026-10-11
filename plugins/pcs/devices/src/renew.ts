import { onTimeout, type Sig } from '@sand/dom'

const renewMargin = 30_000
const minRenew = 60_000

export const renewBeforeExpiry = (expires: number, renew: Sig<number>) =>
  onTimeout(() => renew.update(count => count + 1), Math.max(expires - Date.now() - renewMargin, minRenew))
