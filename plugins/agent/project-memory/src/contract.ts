import { request, type } from '@sand/host-hub/contract'
import { noteName } from '@sand/memory/contract'
import { lazy } from '@sand/util'
import { z } from 'zod'

export interface Version {
  at: number
  hash: string
}

export interface FileRef {
  project: string
  file: string
}

export interface Revision extends FileRef {
  at: number
  text: string
}

export type FileVersions = Record<string, Version>

export type ProjectVersions = Record<string, FileVersions>

export interface Exchanged {
  revisions: Revision[]
  wanted: FileRef[]
}

export const projectMemorySpace = 'project'

export const memoryFile = 'memory.md'

const NOTE_FILE = /^notes\/(.+)\.md$/

export const noteFile = (name: string) => `notes/${name}.md`

export const noteOfFile = (file: string) => file.match(NOTE_FILE)?.[1]

export const projectId = lazy(() => z.string().regex(/^[\w-]+$/))

const file = lazy(() => z.string().refine(path => path === memoryFile || noteName().safeParse(noteOfFile(path)).success, 'Not a memory file'))

export const fileVersions = lazy(() => z.record(file(), z.object({ at: z.number(), hash: z.string() })))

const fileRef = lazy(() => z.object({ project: projectId(), file: file() }))

const revisions = lazy(() => z.array(fileRef().extend({ at: z.number(), text: z.string() })))

export const projectMemoryExchange = request('project-memory.exchange', {
  input: () => z.object({ versions: z.record(projectId(), fileVersions()) }),
  output: type<Exchanged>(),
  callers: 'pc',
})

export const projectMemoryPut = request('project-memory.put', { input: () => z.object({ revisions: revisions() }), output: type<void>(), callers: 'pc' })
