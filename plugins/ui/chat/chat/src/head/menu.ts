import { picker } from '@sand/picker/contract'
import type { IconName } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import type { Child } from '@vaakx-dev/vrui'
import type { ChatContext } from '../context'

interface Entry {
  label: string
  icon: IconName
  run(): void | Promise<void>
}

export const renameThread = async (ctx: ChatContext, id: string | undefined) => {
  const thread = id ? ctx.threads.get(id) : undefined
  const ask = ctx.get(picker)
  if (!thread || !ask) return
  const title = oneLine((await ask.input('Rename thread', thread.info.title)) ?? '')
  if (title) await ctx.threads.rename(thread.id, title)
}

const entries = (ctx: ChatContext, id: string | undefined): Entry[] => {
  if (!id || !ctx.threads.get(id)) return []
  const rename: Entry[] = ctx.get(picker) ? [{ label: 'Rename…', icon: 'pencil', run: () => renameThread(ctx, id) }] : []
  return [...rename, { label: 'Copy link', icon: 'link', run: () => void ctx.kit.copyText(ctx.threads.link(id)) }]
}

export const threadMenu = (ctx: ChatContext, id: string | undefined, close: () => void): Child[] =>
  entries(ctx, id).map(entry =>
    ctx.kit.menuItem(
      {
        icon: entry.icon,
        onClick: () => {
          close()
          void entry.run()
        },
      },
      entry.label,
    ),
  )
