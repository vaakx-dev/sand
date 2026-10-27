import type { PaletteItem, PalettePage } from '@sand/palette/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import type { Thread, Threads } from '@sand/web-client/contract'

export const renamePage = (threads: Threads, thread: Thread): PalettePage => ({
  id: 'rename',
  title: 'Rename thread',
  field: {
    kind: 'text',
    value: thread.info.title,
    placeholder: 'Thread name',
    action: value => ({ label: 'Save', enabled: Boolean(value.trim()) && value.trim() !== thread.info.title }),
    async submit(value) {
      await threads.rename(thread.id, oneLine(value))
    },
  },
})

export const sessionActions = (kit: Kit, threads: Threads, thread: Thread): PaletteItem[] => {
  const group = 'This thread'
  return [
    {
      id: 'command:name',
      group,
      icon: 'pencil',
      label: 'Rename…',
      search: 'rename thread title',
      page: () => renamePage(threads, thread),
    },
    {
      id: 'session:copy-id',
      group,
      icon: 'copy',
      label: 'Copy thread ID',
      detail: thread.id,
      search: 'copy thread id reference',
      run: () => void kit.copyText(thread.id),
    },
  ]
}
