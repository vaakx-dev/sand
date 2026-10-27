import { collectScope, disposeAll, onDisconnect } from '@vaakx-dev/vrui'

export const ownedByNode = <T extends Node>(build: () => T): T => {
  const { value, scope } = collectScope(build)
  collectScope(() => onDisconnect(value, () => disposeAll(scope)))
  return value
}
