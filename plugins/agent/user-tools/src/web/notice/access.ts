import { sig } from '@vaakx-dev/vrui'
import { alertAccess, requestAlerts } from '../integrations/alerts'

export const createAccess = () => {
  const state = sig(alertAccess())
  const ask = () =>
    void requestAlerts()
      .catch(alertAccess)
      .then(access => state.set(access))
  return { state, ask }
}

export type Access = ReturnType<typeof createAccess>
