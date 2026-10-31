import type { DiffLine } from '../contract'

export type { DiffLine }

export type DiffSpan = NonNullable<DiffLine['marks']>[number]

export const quotable = (line: DiffLine | undefined) => line?.kind === 'add' || line?.kind === 'del' || line?.kind === 'ctx'
