import { errorMessage, exactTime } from '@sand/util'
import { derive, div, onInterval, show, sig, span, type Sig } from '@vaakx-dev/vrui'
import { type BotWatch, botWatchRemove } from '../contract'
import type { ListeningContext } from './context'

const minute = 60_000

const sinceText = (at: number, now: number) => {
  const minutes = Math.floor((now - at) / minute)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days} ${days === 1 ? 'day' : 'days'} ago` : `on ${new Date(at).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
}

const isLink = (value: string) => /^(https?:\/\/|\/)/.test(value)

const infoLine = ({ kit }: ListeningContext, entry: Sig<[string, string]>) => {
  const value = () => entry.get()[1]
  return div(
    show(
      () => isLink(value()),
      () =>
        div(
          { class: 'flex min-w-0 items-center gap-1' },
          span({ class: 'min-w-0 flex-1 truncate font-mono text-xs text-neutral-100', title: value }, value),
          kit.copyButton({ text: value, title: () => `Copy the ${entry.get()[0]}` }),
        ),
    ),
    show(
      () => !isLink(value()),
      () => span({ class: 'text-xs text-neutral-500' }, value),
    ),
  )
}

const statusLine = (watch: Sig<BotWatch>, now: Sig<number>) => {
  const changed = () => watch.get().changed
  const error = () => watch.get().error
  const since = () => {
    const at = changed()
    return at === undefined ? 'No change yet' : `Changed ${sinceText(at, now.get())}`
  }
  return div(
    show(
      () => Boolean(error()),
      () => span({ class: 'text-xs wrap-anywhere text-danger-400' }, () => error() ?? ''),
    ),
    show(
      () => !error(),
      () => span({ class: 'text-xs text-neutral-500', title: () => exactTime(changed()) }, since),
    ),
  )
}

const watchRow = (ctx: ListeningContext, watch: Sig<BotWatch>, now: Sig<number>, failed: (error: unknown) => void) => {
  const { kit } = ctx
  const info = derive(() => Object.entries(watch.get().info ?? {}))
  return div(
    { class: 'flex min-w-0 flex-col gap-px px-2 py-2' },
    div(
      { class: 'flex min-w-0 items-start gap-2' },
      span({ class: 'min-w-0 flex-1 pt-1 text-sm wrap-anywhere text-neutral-100' }, () => watch.get().label),
      kit.rowAction({ label: 'Remove', danger: true, run: () => void ctx.wire.call(botWatchRemove, { watch: watch.get().id }).catch(failed) }),
    ),
    span({ class: 'text-xs wrap-anywhere text-neutral-400', title: () => watch.get().kindLabel }, () => watch.get().target),
    kit.rowList(info, ([key]) => key, entry => infoLine(ctx, entry)),
    statusLine(watch, now),
  )
}

export const listeningSection = (ctx: ListeningContext, watches: Sig<BotWatch[]>) => {
  const { kit } = ctx
  const failure = sig<string | undefined>(undefined)
  const failed = (error: unknown) => failure.set(errorMessage(error))
  const now = sig(Date.now())
  const section = div(
    { class: 'flex flex-col pb-3' },
    kit.sectionHeading('Listening'),
    kit.rowList(watches, watch => watch.id, watch => watchRow(ctx, watch, now, failed)),
    show(
      () => Boolean(failure.get()),
      () => div({ class: 'px-2' }, kit.errorText(() => failure.get() ?? '')),
    ),
  )
  onInterval(() => now.set(Date.now()), minute / 2, section)
  return section
}
