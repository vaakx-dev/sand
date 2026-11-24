import { bearerToken } from '@sand/util/host'
import type { RouteCaller } from '../contract'
import type { Sessions } from './sessions'

export const createBearer =
  (sessions: Pick<Sessions, 'caller'>) =>
  (request: Request): RouteCaller | undefined => {
    const token = bearerToken(request)
    return token ? sessions.caller(token) : undefined
  }
