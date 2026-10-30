import type { RouteCaller } from '../contract'
import type { Sessions } from './sessions'

const scheme = /^Bearer\s+(\S+)\s*$/i

export const createBearer =
  (sessions: Pick<Sessions, 'caller'>) =>
  (request: Request): RouteCaller | undefined => {
    const token = scheme.exec(request.headers.get('authorization') ?? '')?.[1]
    return token ? sessions.caller(token) : undefined
  }
