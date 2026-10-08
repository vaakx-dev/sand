import { collectScope, disposeAll, onDisconnect } from '@sand/dom'

const outsideScope = <T>(run: () => T) => collectScope(run).value

export const ownedByNode = <T extends Node>(build: () => T): T => {
  const { value, scope } = collectScope(build)
  outsideScope(() => onDisconnect(value, () => disposeAll(scope)))
  return value
}
