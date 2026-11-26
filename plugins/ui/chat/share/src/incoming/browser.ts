import { keyval } from '@sand/keyval'
import { addressParam } from '@sand/web-client/contract'
import { SHARED_DATABASE, SHARED_KEY, SHARED_PARAM, SHARED_STORE, type Shared } from '@sand/web/contract'

const browserShare = async (): Promise<Shared | undefined> => {
  if (addressParam(SHARED_PARAM) === undefined) return undefined
  const shares = keyval<Shared>(SHARED_DATABASE, SHARED_STORE)
  const found = await shares.get(SHARED_KEY).catch(() => undefined)
  await shares.remove(SHARED_KEY).catch(() => {})
  return found
}

export { browserShare }
