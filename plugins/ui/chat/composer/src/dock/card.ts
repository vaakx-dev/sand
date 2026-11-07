import { Prec } from '@codemirror/state'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { hasFiles } from '@sand/attachments/web/contract'
import type { NavAction } from '@sand/nav/contract'
import { drawChip } from '@sand/context/contract'
import { errorMessage } from '@sand/util'
import { div, dynamicChild, media, span } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { createCompletion } from '../complete/model'
import { chipClipboard } from '../editor/chips/clipboard'
import { chipWidgets } from '../editor/chips/widget'
import { createEditor } from '../editor/view'
import type { Model } from '../model'
import type { Plus } from '../plus/entries'
import { plusView } from '../plus/view'
import { sendControl } from '../send/button'
import { lastPrompt } from '../send/submit'
import { glassPanel } from './glass'
import type { Slots } from './slots'

export interface CardParts {
  ctx: ComposerContext
  model: Model
  slots: Slots
  plus: Plus
  actions: () => NavAction[]
  typed: () => void
}

const placeholder = (model: Model) => () => {
  if (model.running.get()) return 'Add to the running turn'
  const chars = [...new Set(model.triggers.list.get().map(trigger => trigger.char))]
  return chars.length ? `Ask anything, or type ${chars.join(' ')}` : 'Ask anything'
}

const modified = (event: KeyboardEvent) => event.shiftKey || event.altKey || event.ctrlKey || event.metaKey

const edited = (update: ViewUpdate) => update.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete'))

export const card = ({ ctx, model, slots, plus, actions, typed }: CardParts) => {
  const { hasOpenLayer } = ctx.kit
  const coarse = media('(pointer: coarse)')

  const escape = () => {
    if (hasOpenLayer() || !model.running.get()) return false
    void model.target.interrupt().catch(error => model.fail(errorMessage(error)))
    return true
  }

  const recall = (event: KeyboardEvent) => {
    if (model.text.get() || modified(event)) return false
    const prompt = lastPrompt(model.target.path())
    if (!prompt?.text) return false
    model.records.add(prompt.records)
    editor.replace(prompt.text)
    return true
  }

  const keydown = (event: KeyboardEvent) => {
    if (event.isComposing) return false
    if (event.key === 'Escape') return escape()
    if (event.key === 'ArrowUp') return recall(event)
    if (event.key !== 'Enter' || event.shiftKey || coarse.get()) return false
    void model.send()
    return true
  }

  const paste = (event: ClipboardEvent) => model.shelf.get()?.paste(event.clipboardData?.getData('text/plain') ?? '') ?? false

  const completion = createCompletion(ctx.kit, () => model.triggers.list.get(), model.records)
  const editor = createEditor(ctx.kit, model.text, {
    placeholder: placeholder(model),
    extensions: [
      completion.extension,
      chipWidgets(model.records, drawChip(ctx)),
      chipClipboard(model.records),
      Prec.high(EditorView.domEventHandlers({ keydown, paste, drop: hasFiles })),
      EditorView.updateListener.of(update => {
        if (edited(update)) typed()
      }),
    ],
  })

  const choose = () => model.shelf.get()?.pick()

  const node = glassPanel(
    { class: 'relative rounded-xl px-3 pt-3' },
    dynamicChild(model.shelf, shelf => shelf?.view() ?? null),
    editor.node,
    div(
      { class: 'flex h-10 min-w-0 items-center gap-1' },
      plusView(ctx.kit, plus, choose, () => Boolean(model.shelf.get()?.attachable())),
      slots.host('start', 'flex min-w-0 shrink items-center gap-1'),
      span({ class: 'min-w-2 flex-1' }),
      slots.host('end', 'flex min-w-0 shrink items-center gap-1'),
      sendControl(ctx.kit, model, actions),
    ),
  )

  return { node, editor, completion }
}

export type Card = ReturnType<typeof card>
