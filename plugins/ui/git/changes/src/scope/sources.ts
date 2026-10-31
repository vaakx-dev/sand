import { sig } from '@vaakx-dev/vrui'
import type { ChangesScopeSource } from '../contract'

const byOrder = (a: ChangesScopeSource, b: ChangesScopeSource) => (a.order ?? 0) - (b.order ?? 0)

export const scopeSources = () => {
  const list = sig<ChangesScopeSource[]>([])
  const register = (source: ChangesScopeSource) => {
    list.update(sources => [...sources.filter(other => other.id !== source.id), source].sort(byOrder))
    return () => list.update(sources => sources.filter(other => other !== source))
  }
  return { list, register }
}

export type ScopeSources = ReturnType<typeof scopeSources>
