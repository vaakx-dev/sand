import type { PaletteItem } from '@sand/palette/contract'
import type { Kit } from '@sand/ui-kit/contract'
import type { Thread, Threads } from '@sand/web-client/contract'
import type { Context } from 'drydock'
import { canRename, renameThread } from '../items/rename'

export const sessionActions = (ctx: Context, kit: Kit, threads: Threads, thread: Thread): PaletteItem[] => {
  const group = 'This thread'
  return [
    ...(canRename(ctx)
      ? [
          {
            id: 'command:name',
            group,
            icon: 'pencil',
            label: 'Rename…',
            search: 'rename thread title',
            run: () => void renameThread(ctx, threads, thread),
          },
        ]
      : []),
    {
      id: 'session:copy-id',
      group,
      icon: 'copy',
      label: 'Copy thread ID',
      search: 'copy thread id reference',
      run: () => void kit.copyText(thread.id),
    },
  ]
}
