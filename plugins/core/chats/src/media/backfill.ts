import type { CompactFailure, Ledger } from '@sand/ledger/contract'
import type { Media, StoredMedia } from '@sand/media/contract'
import { isRecord } from '@sand/util'
import { setImmediate as nextTurn } from 'node:timers/promises'

interface InlineMedia {
  type: 'image' | 'document'
  mediaType: string
  data: string
  path?: string
}

interface Backfill {
  ledger: Ledger
  media: Media
  signal: AbortSignal
}

const WINDOW_ROWS = 200

const candidatesSql = `select rowid as row from entries
  where rowid >= $from and rowid < $to
    and instr(data, '"data":"') > 0
    and (instr(data, '"type":"image"') > 0 or instr(data, '"type":"document"') > 0)`

const isInline = (value: unknown): value is InlineMedia =>
  isRecord(value) && (value.type === 'image' || value.type === 'document') && typeof value.mediaType === 'string' && typeof value.data === 'string'

const bytesOf = ({ mediaType, data }: InlineMedia) => Buffer.from(data, mediaType.startsWith('text/') ? 'utf8' : 'base64')

const stored = (media: Media, inline: InlineMedia): Omit<InlineMedia, 'data' | 'path'> & StoredMedia => {
  const { data, path, ...block } = inline
  return { ...block, ...media.put(bytesOf(inline), inline.mediaType) }
}

const withStoredMedia = (media: Media, json: string) =>
  JSON.stringify(JSON.parse(json, (_key, value: unknown) => (isInline(value) ? stored(media, value) : value)))

const stillRunning = async (signal: AbortSignal) => {
  await nextTurn()
  return !signal.aborted
}

const moveInlineMedia = async ({ ledger, media, signal }: Backfill): Promise<CompactFailure | undefined> => {
  const { db } = ledger
  const progress = db.query<{ next: number; last: number }, []>('select next, last from media_backfill')
  const advance = db.query('update media_backfill set next = $next')
  const finish = db.query('delete from media_backfill')
  const candidates = db.query<{ row: number }, { from: number; to: number }>(candidatesSql)
  const read = db.query<{ data: string }, { row: number }>('select data from entries where rowid = $row')
  const write = db.query('update entries set data = $data, size = length($data) where rowid = $row')

  const move = (row: number) => {
    const entry = read.get({ row })
    if (entry) write.run({ row, data: withStoredMedia(media, entry.data) })
  }

  for (let state = progress.get(); state && state.next <= state.last; state = progress.get()) {
    if (!(await stillRunning(signal))) return undefined
    const to = Math.min(state.next + WINDOW_ROWS, state.last + 1)
    for (const { row } of candidates.all({ from: state.next, to })) {
      if (!(await stillRunning(signal))) return undefined
      move(row)
    }
    advance.run({ next: to })
  }
  if (!progress.get()) return undefined
  const failure = ledger.compact()
  if (!failure) finish.run()
  return failure
}

export { moveInlineMedia }
