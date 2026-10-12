import { isInside, uuid } from '@sand/kit'
import type { WireRequest } from '@sand/protocol'
import type { ThreadExportPage, ThreadImportResult } from '@sand/sessions-sqlite/contract'

export interface MovePc {
  id: string
  name: string
}

export type MoveCall = <T>(request: WireRequest, pc: string) => Promise<T>

export interface ThreadMove {
  thread: string
  named: boolean
  source: MovePc
  target: MovePc
  folders: string[]
  project?: string
  ask?: (missing: string) => Promise<string | undefined>
}

const copyEntries = async (call: MoveCall, { thread, source, target }: ThreadMove, transfer: string) => {
  const exported = (offset: number) => call<ThreadExportPage>({ type: 'thread.export', session: thread, offset }, source.id)
  const stage = (page: ThreadExportPage) => call({ type: 'thread.stage', transfer, entries: page.entries }, target.id)
  const first = await exported(0)
  await stage(first)
  let page = first
  while (page.next !== null) {
    page = await exported(page.next)
    await stage(page)
  }
  return first
}

const link = (call: MoveCall, { thread, source, target }: ThreadMove, session: string) =>
  call({ type: 'thread.link', session: thread, to: { device: target.id, name: target.name, session } }, source.id).then(
    () => true,
    () => false,
  )

export const moveThread = async (call: MoveCall, move: ThreadMove) => {
  const { source, target } = move
  const transfer = uuid()
  const { title, scratch } = await copyEntries(call, move, transfer)
  const from = { device: source.id, name: source.name, session: move.thread }
  const queue = scratch ? [] : [...move.folders]
  let folder = queue.shift()
  for (;;) {
    const place = folder ? { cwd: folder, ...(move.project && { project: move.project }) } : {}
    const result = await call<ThreadImportResult>({ type: 'thread.import', transfer, ...place, title, named: move.named, from, pc: target.name }, target.id)
    if ('session' in result) return { session: result.session, linked: await link(call, move, result.session) }
    folder = queue.shift() ?? (await move.ask?.(result.missing))
    if (!folder) throw new Error(`${result.missing} doesn't exist on ${target.name}`)
  }
}

const mapInto = (cwd: string, to: string, sep: string, from?: string) => {
  if (!from || !isInside(cwd, from)) return to
  const parts = cwd.slice(from.replace(/[\\/]+$/, '').length).split(/[\\/]+/).filter(Boolean)
  return [to.replace(/[\\/]+$/, ''), ...parts].join(sep)
}

export const foldersFor = (cwd: string, to: string, sep: string, from?: string) => [...new Set([mapInto(cwd, to, sep, from), to])]
