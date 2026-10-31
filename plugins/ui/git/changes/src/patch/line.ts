import type { Kit } from '@sand/ui-kit/contract'

export type DiffLine = Parameters<Kit['diffRow']>[0]

export type DiffSpan = NonNullable<DiffLine['marks']>[number]

export const quotable = (line: DiffLine | undefined) => line?.kind === 'add' || line?.kind === 'del' || line?.kind === 'ctx'
