import type { Wire } from '@sand/devices-contract'
import { logbookSearch, type Entry } from '@sand/logbook/contract'
import { errorMessage } from '@sand/util'
import { effect, sig } from '@vaakx-dev/vrui'

interface SearchParts {
  wire: Wire
  version(): number
  project(): string | undefined
}

const PAGE_SIZE = 100

const search = ({ wire, version, project }: SearchParts) => {
  const query = sig('')
  const tag = sig<string | undefined>(undefined)
  const pages = sig(1)
  const entries = sig<Entry[] | undefined>(undefined)
  const failure = sig('')
  let asked = 0

  const filters = () => ({ query: query.get().trim() || undefined, project: project(), tag: tag.get(), limit: PAGE_SIZE })
  const load = (input: ReturnType<typeof filters>) => {
    const request = ++asked
    const current = () => request === asked
    const offsets = Array.from({ length: pages.get() }, (_, page) => page * PAGE_SIZE)
    Promise.all(offsets.map(offset => wire.call(logbookSearch, { ...input, offset }))).then(
      found => {
        if (!current()) return
        entries.set(found.flat())
        failure.set('')
      },
      error => current() && failure.set(errorMessage(error)),
    )
  }
  const reload = () => load(filters())

  effect(() => {
    version()
    const input = filters()
    if (wire.ready()) load(input)
  })

  return {
    query,
    tag,
    entries,
    failure,
    reload,
    filtered: () => Boolean(query.get().trim() || tag.get()),
    more: () => (entries.get()?.length ?? 0) >= pages.get() * PAGE_SIZE,
    showMore: () => pages.update(shown => shown + 1),
  }
}

type Search = ReturnType<typeof search>

export { search, type Search }
