import { picker } from '@sand/picker/contract'
import type { IconName, kit } from '@sand/ui-kit/contract'
import { oneLine } from '@sand/util'
import { threads } from '@sand/web-client/contract'
import type { Child } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'

type HeaderContext = Context<{ kit: typeof kit }>

interface Entry {
  label: string
  icon: IconName
  run(): void | Promise<void>
}

export const renameThread = async (ctx: Context) => {
  const thread = ctx.get(threads)?.current()
  const ask = ctx.get(picker)
  if (!thread || !ask) return
  const title = oneLine((await ask.input('Rename thread', thread.info.title)) ?? '')
  if (title) await ctx.get(threads)?.rename(thread.id, title)
}

const entries = (ctx: HeaderContext): Entry[] => {
  const rename: Entry[] = ctx.get(threads)?.current() && ctx.get(picker) ? [{ label: 'Rename…', icon: 'pencil', run: () => renameThread(ctx) }] : []
  return [...rename, { label: 'Copy link', icon: 'link', run: () => void ctx.kit.copyText(location.href) }]
}

export const chatMenu = (ctx: HeaderContext, close: () => void): Child[] =>
  entries(ctx).map(entry =>
    ctx.kit.popoverItem(
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
