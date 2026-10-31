import type { DiffPatch } from '@sand/git-diff/contract'
import type { FileChangeKind, Kit } from '@sand/ui-kit/contract'
import type { Child, Cleanup, Derive, MaybeReactive, Sig } from '@vaakx-dev/vrui'
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
  kind: FileChangeKind
  add: number
  del: number
}

export interface DiffHeadOptions {
  open: Sig<boolean>
  tags?: Child
  actions?: Child
}

export type PatchState = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; patch: DiffPatch } | { kind: 'error'; message: string }

export interface PatchFile {
  path: string
  binary?: boolean
}

export interface PatchStore<F extends PatchFile> {
  state(file: F): Sig<PatchState>
  files(files: F[]): void
  seen(path: string, near: boolean): void
  retry(path: string): void
  stale(paths?: Iterable<string>): void
  reset(): void
}

export interface DiffSectionFile extends DiffHeadFile, PatchFile {}

export interface DiffSectionOptions<F extends DiffSectionFile> {
  patches: PatchStore<F>
  open: Sig<boolean>
  tags?: Child
  actions?: Child
  onMount?(element: HTMLElement): Cleanup
  body(patch: DiffPatch): HTMLElement
}

export interface DiffLayout {
  split: Derive<boolean>
  measure(element: HTMLElement): void
  splitButton(): Child
}

export interface DiffView {
  selection(): DiffSelection
  pathLabel(path: () => string): HTMLElement
  head(file: () => DiffHeadFile, options: DiffHeadOptions): HTMLElement
  file(patch: DiffPatch, options: DiffFileOptions): HTMLElement
  lines(patch: DiffPatch): DiffLine[]
  patches<F extends PatchFile>(load: (file: F) => Promise<DiffPatch>, loaded?: (path: string) => void): PatchStore<F>
  section<F extends DiffSectionFile>(file: Sig<F>, options: DiffSectionOptions<F>): HTMLElement
  layout(): DiffLayout
}

export const diffView = service<DiffView>('diffView')
