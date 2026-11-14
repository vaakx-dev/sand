import { errorMessage } from '@sand/util'
import { sig } from '@vaakx-dev/vrui'
import type { Found, FoundFile } from '../contract'

type Shown =
  | { kind: 'finding'; mention: string }
  | { kind: 'found'; file: FoundFile }
  | { kind: 'missing'; mention: string }
  | { kind: 'failed'; mention: string; error: string }

type Find = (thread: string, mention: string) => Promise<Found>

const shownOf = (found: Found, mention: string): Shown => ('file' in found ? { kind: 'found', file: found.file } : { kind: 'missing', mention })

const openFiles = (find: Find) => {
  const shown = sig<ReadonlyMap<string, Shown>>(new Map())

  const set = (thread: string, value: Shown) => shown.update(all => new Map(all).set(thread, value))

  const open = async (thread: string, mention: string) => {
    const finding: Shown = { kind: 'finding', mention }
    set(thread, finding)
    const next = await find(thread, mention).then(
      found => shownOf(found, mention),
      (error: unknown): Shown => ({ kind: 'failed', mention, error: errorMessage(error) }),
    )
    if (shown.get().get(thread) === finding) set(thread, next)
  }

  const fresher = (file: FoundFile) => (value: Shown) => (value.kind === 'found' && value.file.path === file.path ? { kind: 'found' as const, file } : value)

  const changed = (file: FoundFile) => shown.update(all => new Map([...all].map(([thread, value]) => [thread, fresher(file)(value)])))

  return { of: (thread: string) => shown.get().get(thread), open, changed }
}

type OpenFiles = ReturnType<typeof openFiles>

export { openFiles, type OpenFiles, type Shown }
