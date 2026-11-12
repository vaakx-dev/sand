import type { FileKind } from '@sand/git/contract'
import { request, type } from '@sand/host-hub/contract'
import { lazy } from '@sand/util'
import { service } from 'drydock'
import { z } from 'zod'

export type DiffScope =
  | { kind: 'all'; base?: string }
  | { kind: 'uncommitted' }
  | { kind: 'since'; commit: string }
  | { kind: 'commit'; commit: string }
  | { kind: 'range'; from: string; to: string }

export interface DiffFile {
  path: string
  from?: string
  kind: FileKind
  add: number
  del: number
  binary?: boolean
}

export interface DiffList {
  scope: DiffScope
  base?: string
  baseLabel?: string
  files: DiffFile[]
  total: number
  add: number
  del: number
  truncated?: boolean
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: string[]
}

export interface DiffPatch {
  path: string
  from?: string
  hunks: DiffHunk[]
  binary?: boolean
  tooLarge?: boolean
}

const scope = lazy(() => z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all'), base: z.string().optional() }),
  z.object({ kind: z.literal('uncommitted') }),
  z.object({ kind: z.literal('since'), commit: z.string() }),
  z.object({ kind: z.literal('commit'), commit: z.string() }),
  z.object({ kind: z.literal('range'), from: z.string(), to: z.string() }),
]))

export const gitDiff = request('git.diff', { input: () => z.object({ cwd: z.string(), scope: scope() }), output: type<DiffList>(), place: 'thread' })

export const gitPatch = request('git.patch', {
  input: () => z.object({ cwd: z.string(), scope: scope(), path: z.string(), from: z.string().optional() }),
  output: type<DiffPatch>(),
  place: 'thread',
})

export interface PatchInput {
  cwd: string
  scope: DiffScope
  path: string
  from?: string
}

export interface GitDiffs {
  list(cwd: string, scope: DiffScope): Promise<DiffList>
  patch(input: PatchInput): Promise<DiffPatch>
}

export const gitDiffs = service<GitDiffs>('gitDiffs')
