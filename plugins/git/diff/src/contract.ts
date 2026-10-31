import type { FileKind } from '@sand/git/contract'
import { request, type } from '@sand/host-hub/contract'
import { z } from 'zod'

export type DiffScope = { kind: 'all'; base?: string } | { kind: 'uncommitted' } | { kind: 'commit'; commit: string }

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

const scope = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all'), base: z.string().optional() }),
  z.object({ kind: z.literal('uncommitted') }),
  z.object({ kind: z.literal('commit'), commit: z.string() }),
])

export const gitDiff = request('git.diff', { input: z.object({ cwd: z.string(), scope }), output: type<DiffList>(), place: 'thread' })

export const gitPatch = request('git.patch', {
  input: z.object({ cwd: z.string(), scope, path: z.string(), from: z.string().optional() }),
  output: type<DiffPatch>(),
  place: 'thread',
})
