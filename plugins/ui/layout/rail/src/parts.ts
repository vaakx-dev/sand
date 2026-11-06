import type { Spaces } from '@sand/layout/contract'
import type { Derive, Sig } from '@vaakx-dev/vrui'
import type { RailAction } from './contract'

export interface RailParts {
  narrow: Derive<boolean>
  spaces: Spaces
  actions: Sig<RailAction[]>
  lit: Derive<ReadonlySet<string>>
  busy(id: string): boolean
  run(action: RailAction): void
}
