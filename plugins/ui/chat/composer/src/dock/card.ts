import { Prec } from '@codemirror/state'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { drawChip } from '@sand/context/contract'
import { errorMessage } from '@sand/util'
import { BREAKPOINT, div, input, media, span, type Sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import type { Trigger } from '../contract'
import { pastedFile, pasteLimit } from '../attachments/content'
import { hasFiles } from '../attachments/drop'
import { shelf } from '../attachments/shelf'
import { createCompletion } from '../complete/model'
import { chipClipboard } from '../editor/chips/clipboard'
import { chipWidgets } from '../editor/chips/widget'
import { createEditor } from '../editor/view'
import type { Model } from '../model'
import type { Plus } from '../plus/entries'
import { plusView } from '../plus/view'
import { sendControl } from '../send/button'
import type { SendMenu } from '../send/menu'
import { interrupt, lastPrompt } from '../send/submit'
import { glassPanel } from './glass'
import type { Slots } from './slots'

export interface CardParts {
  ctx: ComposerContext
  model: Model
  slots: Slots
  menu: SendMenu
  plus: Plus
  dropping: Sig<boolean>
  typed: () => void
}

const labelsByChar = (triggers: Trigger[]) => {
  const labels = new Map<string, string[]>()
  for (const { char, label } of triggers) labels.set(char, [...(labels.get(char) ?? []), label])
  return labels
}

const hints = (labels: Map<string, string[]>, wide: boolean) => {
  if (!labels.size) return []
  if (!wide) return [`or type ${[...labels.keys()].join(' ')}`]
  return [...labels].map(([char, names]) => `${char} ${names.join(' and ')}`)
}

const placeholder = (model: Model, wide: () => boolean) => () => {
  if (model.running.get()) return 'Add to the running turn'
  return ['Ask anything', ...hints(labelsByChar(model.triggers.list.get()), wide())].join(', ')
}

const modified = (event: KeyboardEvent) => event.shiftKey || event.altKey || event.ctrlKey || event.metaKey

const edited = (update: ViewUpdate) => update.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete'))

export const card = ({ ctx, model, slots, menu, plus, typed }: CardParts) => {
  const { hasOpenLayer } = ctx.kit
  const coarse = media('(pointer: coarse)')
  const wide = media(`(min-width: ${BREAKPOINT.md})`)

  const escape = () => {
    if (hasOpenLayer() || !model.running.get()) return false
    void interrupt(ctx).catch(error => model.fail(errorMessage(error)))
    return true
  }

  const recall = (event: KeyboardEvent) => {
    if (model.text.get() || modified(event)) return false
    const text = lastPrompt(ctx)
    if (!text) return false
    editor.replace(text)
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

  const paste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.getData('text/plain') ?? ''
    if (pasted.length <= pasteLimit) return false
    model.files.add([pastedFile(pasted)])
    return true
  }

  const completion = createCompletion(ctx.kit, () => model.triggers.list.get(), model.records)
  const editor = createEditor(ctx.kit, model.text, {
    placeholder: placeholder(model, () => wide.get()),
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

  const picker = input({
    type: 'file',
    multiple: true,
    hidden: true,
    onChange: () => {
      model.files.add(picker.files ?? [])
      picker.value = ''
    },
  })
  const choose = () => picker.click()

  const node = glassPanel(
    { class: 'relative rounded-xl px-3 pt-3' },
    shelf(ctx, model.files),
    editor.node,
    div(
      { class: 'flex h-10 min-w-0 items-center gap-1' },
      plusView(ctx.kit, plus, choose),
      slots.host('start', 'flex min-w-0 shrink items-center gap-1'),
      span({ class: 'min-w-2 flex-1' }),
      slots.host('end', 'flex min-w-0 shrink items-center gap-1'),
      sendControl(ctx.kit, model, menu),
    ),
    picker,
  )

  return { node, editor, completion }
}

export type Card = ReturnType<typeof card>
