import { hasFiles } from '@sand/attachments/web/contract'
import type { MenuAction } from '@sand/ui-shell/contract'
import { drawChip } from '@sand/context/contract'
import { errorMessage } from '@sand/util'
import { div, dynamicChild, listen, media, onTimeout, sig, span } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { createCompletion } from '../complete/model'
import { createEditor } from '../editor/view'
import { createHandoff } from '../handoff'
import type { Model } from '../model'
import type { Plus } from '../plus/entries'
import { plusView } from '../plus/view'
import type { Asides } from '../send/aside'
import { sendControl } from '../send/button'
import { lastPrompt } from '../send/submit'
import type { Source } from '../complete/registry'
import type { Slots } from './slots'

export interface FieldParts {
  ctx: ComposerContext
  model: Model
  slots: Slots
  plus: Plus
  actions: () => MenuAction[]
  typed: () => void
  placeholder: () => string
  asides: Asides
}

const modified = (event: KeyboardEvent) => event.shiftKey || event.altKey || event.ctrlKey || event.metaKey

const onButton = (event: MouseEvent) => event.target instanceof Element && Boolean(event.target.closest('button'))

const holdMs = 450

const shortcuts = (sources: Source[]) => {
  const byChar = new Map<string, string[]>()
  for (const { char, label } of sources) byChar.set(char, [...(byChar.get(char) ?? []), label])
  return [...byChar].map(([char, labels]) => `${char} ${labels.join(', ')}`).join(' · ')
}

const saveKey = (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 's'

export const field = ({ ctx, model, slots, plus, actions, typed, placeholder, asides }: FieldParts) => {
  const { hasOpenLayer } = ctx.kit
  const coarse = media('(pointer: coarse)')
  const within = sig(false)

  const escape = () => {
    if (hasOpenLayer() || !model.running.get()) return false
    void model.target.interrupt().catch(error => model.fail(errorMessage(error)))
    return true
  }

  let holding: (() => void) | undefined

  const aside = () => {
    holding = undefined
    void asides.run(model)
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
    if (!asides.ready()) void model.send()
    else if (!event.repeat && !holding) holding = onTimeout(aside, holdMs)
    return true
  }

  const keyup = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || !holding) return false
    holding()
    holding = undefined
    void model.send()
    return true
  }

  const paste = (event: ClipboardEvent) => model.shelf.get()?.paste(event.clipboardData?.getData('text/plain') ?? '') ?? false

  const completion = createCompletion(ctx.kit, () => model.triggers.list.get(), model.records)
  const editor = createEditor({
    kit: ctx.kit,
    text: model.text,
    placeholder,
    keys: { keydown, keyup, paste, drop: hasFiles },
    typed,
    completion,
    records: model.records,
    chip: drawChip(ctx),
  })

  const here = { restore: createHandoff(model, () => editor.focusEnd()).restore }

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
        'flex flex-col rounded-2xl bg-neutral-800 pt-3 pr-2 pb-2 pl-4',
        () => (coarse.get() ? 'text-base' : 'text-sm'),
      ],
      onMouseDown: keepFocus,
      onFocusIn: () => within.set(true),
      onFocusOut: leave,
      onMount: () =>
        listen(window, 'keydown', (event: KeyboardEvent) => {
          if (!saveKey(event) || !asides.ready()) return
          event.preventDefault()
          void asides.run(model)
        }),
    },
    dynamicChild(model.shelf, shelf => (shelf ? div({ class: 'pr-2 pb-3', hidden: model.attached.map(held => !held.length) }, shelf.view()) : null)),
    div({ class: 'min-w-0 flex-1 cursor-text pr-2', onMouseDown: focusText }, editor.node),
    div(
      { class: '-ml-2 mt-4 flex min-w-0 items-center gap-1' },
      plusView(ctx.kit, plus, choose, () => Boolean(model.shelf.get()?.attachable())),
      slots.host('start', 'flex min-w-0 shrink items-center gap-1', here),
      span(
        { class: 'min-w-2 flex-1 truncate px-1 text-xs text-neutral-600', 'aria-hidden': 'true' },
        () => (model.empty.get() ? shortcuts(model.triggers.list.get()) : ''),
      ),
      slots.host('end', 'flex min-w-0 shrink items-center gap-1', here),
      sendControl(ctx.kit, model, actions, () => (asides.ready() ? () => void asides.run(model) : undefined)),
    ),
  )

  return { node, editor, completion, here }
}

export type Field = ReturnType<typeof field>
