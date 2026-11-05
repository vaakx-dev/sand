import { linkedRecords, type ContextBlock, type ContextLink, type ContextRecord } from '@sand/chats/contract'
import { sig } from '@vaakx-dev/vrui'

export const createRecords = () => {
  const list = sig<ContextRecord[]>([])
  const linked = (text: string) => linkedRecords(text, list.get())
  return {
    list,
    linked,
    find: ({ kind, id }: ContextLink) => list.get().find(record => record.id === id && record.kind === kind),
    add: (records: ContextRecord[]) =>
      list.update(held => records.reduce((all, record) => (all.some(known => known.id === record.id && known.kind === record.kind) ? all : [...all, record]), held)),
    content(text: string): ContextBlock[] {
      const records = linked(text)
      return records.length ? [{ type: 'context', records }] : []
    },
  }
}

export type Records = ReturnType<typeof createRecords>
