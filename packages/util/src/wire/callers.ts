import type { CallerKind, RequestCallers } from '@sand/host-hub/contract'

const userKinds = new Set<CallerKind>(['phone', 'browser', 'cli'])

export const callerAllowed = (callers: RequestCallers, kind: CallerKind) => {
  if (callers === 'any') return kind !== 'runtime'
  if (callers === 'pc') return kind === 'pc'
  if (callers === 'runtime') return kind === 'runtime'
  return userKinds.has(kind)
}
