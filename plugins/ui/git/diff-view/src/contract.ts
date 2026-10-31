import type { DiffPatch } from '@sand/git-diff/contract'
import type { FileKind } from '@sand/git/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Child, Derive, MaybeReactive, Sig } from '@vaakx-dev/vrui'
import { service } from 'drydock'

export type DiffLine = Parameters<Kit['diffRow']>[0]

export type DiffSide = 'old' | 'new'

export interface DiffRange {
  path: string
  start: number
  end: number
  side: DiffSide
  lines: DiffLine[]
}

export interface DiffSelection {
  range: Derive<DiffRange | undefined>
  settled: Derive<DiffRange | undefined>
  clear(path?: string): void
}

export type DiffNote = () => Child

export interface DiffFileOptions {
  split: MaybeReactive<boolean>
  selection?: DiffSelection
  decorate?(line: DiffLine): DiffNote | null
}

export interface DiffHeadFile {
  path: string
  from?: string
  kind: FileKind
  add: number
  del: number
}

export interface DiffHeadOptions {
  open: Sig<boolean>
  tags?: Child
  actions?: Child
}

export interface DiffMarks {
  kind(kind: () => FileKind): HTMLElement
  path(path: () => string): HTMLElement
  stat(add: () => number, del: () => number): HTMLElement
}

export interface DiffView {
  selection(): DiffSelection
  marks: DiffMarks
  head(file: () => DiffHeadFile, options: DiffHeadOptions): HTMLElement
  file(patch: DiffPatch, options: DiffFileOptions): HTMLElement
  lines(patch: DiffPatch): DiffLine[]
}

export const diffView = service<DiffView>('diffView')
