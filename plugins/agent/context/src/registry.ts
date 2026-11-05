export const kindRegistry = <T extends { kind: string }>() => {
  const kinds = new Map<string, T>()
  const register = (kind: T) => {
    kinds.set(kind.kind, kind)
    return () => {
      if (kinds.get(kind.kind) === kind) kinds.delete(kind.kind)
    }
  }
  return { get: (name: string) => kinds.get(name), register }
}
