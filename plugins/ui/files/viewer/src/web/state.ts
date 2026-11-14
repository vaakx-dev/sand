import { errorMessage } from '@sand/util'
import { sig, stored } from '@vaakx-dev/vrui'
import type { Found, FoundFile } from '../contract'

type Shown =
  | { kind: 'finding'; mention: string }
  | { kind: 'found'; file: FoundFile }
  | { kind: 'missing'; mention: string }
  | { kind: 'failed'; mention: string; error: string }

type Find = (thread: string, mention: string) => Promise<Found>

const LAST_OPENED = 'sand.files.last'

const shownOf = (found: Found, mention: string): Shown => ('file' in found ? { kind: 'found', file: found.file } : { kind: 'missing', mention })

const openFiles = (find: Find) => {
  const shown = sig<ReadonlyMap<string, Shown>>(new Map())
  const last = stored(LAST_OPENED, { thread: '', path: '' })

  const set = (thread: string, value: Shown) => shown.update(all => new Map(all).set(thread, value))

  const open = async (thread: string, mention: string) => {
    const finding: Shown = { kind: 'finding', mention }
    set(thread, finding)
    const next = await find(thread, mention).then(
      found => shownOf(found, mention),
      (error: unknown): Shown => ({ kind: 'failed', mention, error: errorMessage(error) }),
    )
    if (shown.get().get(thread) !== finding) return
    set(thread, next)
    if (next.kind === 'found') last.set({ thread, path: next.file.path })
  }

  const reopen = () => {
    const { thread, path } = last.get()
    if (thread) void open(thread, path)
  }

  const fresher = (file: FoundFile) => (value: Shown) => (value.kind === 'found' && value.file.path === file.path ? { kind: 'found' as const, file } : value)

  const changed = (file: FoundFile) => shown.update(all => new Map([...all].map(([thread, value]) => [thread, fresher(file)(value)])))

  return { of: (thread: string) => shown.get().get(thread), open, reopen, changed }
}

type OpenFiles = ReturnType<typeof openFiles>

export { openFiles, type OpenFiles, type Shown }
