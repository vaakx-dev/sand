import { memoryChangeWire, memoryLimit, memoryRead, memoryWrite } from '@sand/bot-memory/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, show, sig, span } from '@vaakx-dev/vrui'
import type { BotsContext } from '../context'

const changedNote = ({ linkButton }: BotsContext['kit'], reload: () => void) =>
  div({ class: 'flex flex-wrap items-center gap-2 text-xs text-neutral-400' }, span('The bot rewrote its memory.'), linkButton({ onClick: reload }, 'Load its version'))

export const memorySection = (ctx: BotsContext, bot: string) => {
  const { errorText, loadingState, primaryAction, rowDetail, settingsSection, textArea } = ctx.kit
  const saved = sig<string | undefined>(undefined)
  const latest = sig<string | undefined>(undefined)
  const draft = sig('')
  const saving = sig(false)
  const failure = sig<string | undefined>(undefined)

  const attempt = (work: () => Promise<unknown>) => {
    failure.set(undefined)
    return work().catch(error => failure.set(errorMessage(error)))
  }
  const take = (text: string) => {
    latest.set(text)
    saved.set(text)
    draft.set(text)
  }
  const reload = () => take(latest.get() ?? '')
  void attempt(() => ctx.wire.call(memoryRead, { bot }).then(take))
  const stop = ctx.wire.on(memoryChangeWire, ([changed, text]) => {
    if (changed !== bot) return
    if (draft.get() === saved.get()) take(text)
    else latest.set(text)
  })

  const save = () => {
    const text = draft.get()
    saving.set(true)
    void attempt(() => ctx.wire.call(memoryWrite, { bot, text }).then(() => take(text))).finally(() => saving.set(false))
  }
  const loaded = derive(() => saved.get() !== undefined)
  const outdated = derive(() => latest.get() !== saved.get())

  const editor = () =>
    rowDetail(
      div(
        { class: 'flex flex-col gap-2 pt-3' },
        textArea({ bindValue: draft, rows: 14, placeholder: 'Nothing yet. The bot writes here when its conversation is compacted.', 'aria-label': 'Memory', class: 'font-mono' }),
        show(outdated, () => changedNote(ctx.kit, reload)),
        div(
          { class: 'flex flex-wrap items-center justify-between gap-2' },
          span({ class: 'text-xs text-neutral-400' }, () => `${draft.get().trim().length.toLocaleString()} of ${memoryLimit.toLocaleString()} characters`),
          primaryAction({ size: 'sm', disabled: () => saving.get() || draft.get() === saved.get(), onClick: save }, 'Save'),
        ),
      ),
    )

  return div(
    { class: 'contents', onMount: () => stop },
    settingsSection(
      { title: 'Memory' },
      dynamicChild(loaded, ready => (ready ? editor() : loadingState({ surface: 'group' }))),
      show(
        () => Boolean(failure.get()),
        () => rowDetail(span({ class: 'pt-3' }, errorText(() => failure.get() ?? ''))),
      ),
    ),
  )
}
