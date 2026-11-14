import { foldText, searchWords } from '@sand/util'
import { derive, onTimeout, scoped, sig } from '@vaakx-dev/vrui'
import type { PaletteItem, PaletteLateFound, PaletteLater } from '../contract'
import { PER_GROUP } from './rank'

type Found = ReadonlyMap<string, PaletteLateFound>

interface LateSearch {
  sources: PaletteLater[]
  query: string
  arrive(source: PaletteLater, found: PaletteLateFound): void
}

const DEBOUNCE_MS = 150

const holdsWords = (item: PaletteItem, words: string[]) => {
  const text = foldText(`${item.label} ${item.excerpt?.text ?? ''}`)
  return words.every(word => text.includes(word))
}

const stillMatching = (found: Found, query: string): Found => {
  const words = searchWords(query)
  if (!words.length) return new Map()
  return new Map([...found].map(([id, { items, note }]) => [id, { items: items.filter(item => holdsWords(item, words)), note }]))
}

const lateItems = (sources: PaletteLater[], found: Found) => sources.flatMap(source => found.get(source.id)?.items ?? [])

const lateNote = (sources: PaletteLater[], found: Found) => sources.map(source => found.get(source.id)?.note).find(Boolean) ?? ''

const searched = async (source: PaletteLater, query: string, signal: AbortSignal) => {
  try {
    const { items, note } = await source.items(query, signal)
    return { items: items.slice(0, PER_GROUP).map(item => ({ ...item, group: source.group })), note }
  } catch (error) {
    if (!signal.aborted) console.error(`[palette] ${source.id}`, error)
    return { items: [] }
  }
}

const searchLater = ({ sources, query, arrive }: LateSearch) => {
  const controller = new AbortController()
  const { signal } = controller
  scoped(() => controller.abort())
  const start = (source: PaletteLater) =>
    void searched(source, query, signal).then(found => {
      if (!signal.aborted) arrive(source, found)
    })
  onTimeout(() => sources.forEach(start), DEBOUNCE_MS)
}

const lateRows = (sources: PaletteLater[], keep: (change: () => void) => void) => {
  const found = sig<Found>(new Map())
  const pending = sig<PaletteLater[]>([])

  const arrive = (source: PaletteLater, arrived: PaletteLateFound) =>
    keep(() => {
      found.set(new Map(found.get()).set(source.id, arrived))
      pending.set(pending.get().filter(waiting => waiting !== source))
    })

  const search = (query: string) => {
    const wanted = sources.length > 0 && searchWords(query).length > 0
    keep(() => {
      found.set(stillMatching(found.get(), query))
      pending.set(wanted ? sources : [])
    })
    if (wanted) searchLater({ sources, query, arrive })
  }

  return {
    shown: sources.length > 0,
    items: derive(() => lateItems(sources, found.get())),
    pending: derive(() => pending.get().length > 0),
    waiting: derive(() => pending.get()[0]?.waiting ?? lateNote(sources, found.get())),
    search,
  }
}

export { lateRows }
