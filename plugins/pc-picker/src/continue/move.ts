import type { Machine, Thread, ThreadExportPage, ThreadImportResult, Wire } from '@sand/protocol'
import { uuid } from '@sand/kit'

export type AskFolder = (missing: string) => Promise<string | undefined>

const deviceOf = (machine: Machine) => (machine.local ? '' : machine.id)

const copyEntries = async (wire: Wire, thread: Thread, source: Machine, target: Machine, transfer: string) => {
  let offset: number | null = 0
  let first: ThreadExportPage | undefined
  while (offset !== null) {
    const page: ThreadExportPage = await wire.call<ThreadExportPage>({ type: 'thread.export', session: thread.id, offset }, deviceOf(source))
    first ??= page
    await wire.call({ type: 'thread.stage', transfer, entries: page.entries }, deviceOf(target))
    offset = page.next
  }
  return first!
}

export interface MoveOptions {
  project?: string
  ask?: AskFolder
}

export const moveThread = async (wire: Wire, thread: Thread, source: Machine, target: Machine, folders: string[], options: MoveOptions = {}) => {
  const transfer = uuid()
  const { title, scratch } = await copyEntries(wire, thread, source, target, transfer)
  const from = { device: source.id, name: source.name, session: thread.id }
  const queue = scratch ? [] : [...folders]
  let folder = queue.shift()
  for (;;) {
    const place = folder ? { cwd: folder, ...(options.project && { project: options.project }) } : {}
    const result = await wire.call<ThreadImportResult>(
      { type: 'thread.import', transfer, ...place, title, named: thread.info.named, from, pc: target.name },
      deviceOf(target),
    )
    if ('session' in result) return { session: result.session, linked: await link(wire, thread, source, target, result.session) }
    folder = queue.shift()
    if (folder) continue
    if (!options.ask) throw new Error(`${result.missing} doesn't exist on ${target.name}`)
    folder = await options.ask(result.missing)
    if (!folder) return undefined
  }
}

const link = (wire: Wire, thread: Thread, source: Machine, target: Machine, session: string) =>
  wire
    .call({ type: 'thread.link', session: thread.id, to: { device: target.id, name: target.name, session } }, deviceOf(source))
    .then(
      () => true,
      () => false,
    )
