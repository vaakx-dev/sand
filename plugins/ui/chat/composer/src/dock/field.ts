import { Prec } from '@codemirror/state'
import { EditorView, type ViewUpdate } from '@codemirror/view'
import { hasFiles } from '@sand/attachments/web/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { drawChip } from '@sand/context/contract'
import type { ModelButton, ModelTarget } from '@sand/model-panel/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, media, sig, span } from '@vaakx-dev/vrui'
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
import type { Slots } from './slots'

export interface ModelChoice {
  target: ModelTarget
  button(): ModelButton | undefined
}

export interface FieldParts {
  ctx: ComposerContext
  model: Model
  slots: Slots
  plus: Plus
  actions: () => MenuAction[]
  typed: () => void
  placeholder: () => string
  choice?: ModelChoice
}

const modified = (event: KeyboardEvent) => event.shiftKey || event.altKey || event.ctrlKey || event.metaKey

const edited = (update: ViewUpdate) => update.transactions.some(tr => tr.isUserEvent('input') || tr.isUserEvent('delete'))

const onButton = (event: MouseEvent) => event.target instanceof Element && Boolean(event.target.closest('button'))

export const field = ({ ctx, model, slots, plus, actions, typed, placeholder, choice }: FieldParts) => {
  const { hasOpenLayer } = ctx.kit
  const coarse = media('(pointer: coarse)')
  const within = sig(false)
  const rest = derive(() => coarse.get() && !within.get() && model.empty.get())

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
    placeholder,
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

  const keepFocus = (event: MouseEvent) => {
    if (within.get() && onButton(event)) event.preventDefault()
  }

  const leave = (event: FocusEvent) => within.set(event.relatedTarget instanceof Node && node.contains(event.relatedTarget))

  const focusText = (event: MouseEvent) => {
    if (event.target !== event.currentTarget) return
    event.preventDefault()
    editor.focusEnd()
  }

  const node = div(
    {
      class: [
        'flex rounded-2xl bg-neutral-800',
        () => (rest.get() ? 'items-center' : 'flex-col px-4 pt-3 pb-2'),
        () => (coarse.get() ? 'text-base' : 'text-sm'),
      ],
      onMouseDown: keepFocus,
      onFocusIn: () => within.set(true),
      onFocusOut: leave,
    },
    dynamicChild(model.shelf, shelf => (shelf ? div({ class: () => (rest.get() ? 'px-4 pt-3' : 'pb-3'), hidden: model.attached.map(held => !held.length) }, shelf.view()) : null)),
    div({ class: ['min-w-0 flex-1 cursor-text', () => (rest.get() ? 'py-3 pr-2 pl-4' : '')], onMouseDown: focusText }, editor.node),
    div(
      { class: ['flex min-w-0 items-center gap-1', () => (rest.get() ? 'pr-2' : '-ml-2 mt-4')] },
      span(
        { class: 'contents', hidden: rest },
        plusView(ctx.kit, plus, choose, () => Boolean(model.shelf.get()?.attachable())),
        slots.host('start', 'flex min-w-0 shrink items-center gap-1'),
        span({ class: 'min-w-2 flex-1' }),
        slots.host('end', 'flex min-w-0 shrink items-center gap-1'),
        choice ? dynamicChild(derive(choice.button), found => (found ? found.view(choice.target) : null)) : null,
      ),
      sendControl(ctx.kit, model, actions),
    ),
  )

  return { node, editor, completion }
}

export type Field = ReturnType<typeof field>
