import { Prec } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { errorMessage } from '@sand/util'
import { div, input, media, span, type Sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { pastedFile, pasteLimit } from '../attachments/content'
import { hasFiles } from '../attachments/drop'
import { shelf } from '../attachments/shelf'
import { createCompletion, type CompletionSource } from '../complete/model'
import { builtinSources } from '../complete/sources'
import { createEditor } from '../editor/view'
import type { Model } from '../model'
import type { Plus } from '../plus/entries'
import { plusView } from '../plus/view'
import { sendControl } from '../send/button'
import type { SendMenu } from '../send/menu'
import { interrupt } from '../send/submit'
import { glassPanel } from './glass'
import type { Slots } from './slots'

export interface CardParts {
  ctx: ComposerContext
  model: Model
  slots: Slots
  menu: SendMenu
  plus: Plus
  dropping: Sig<boolean>
}

const placeholder = (model: Model, sources: CompletionSource[]) => () => {
  if (model.running.get()) return 'Add to the running turn'
  const triggers = sources.filter(source => source.ready()).map(source => `${source.trigger} ${source.label}`)
  return ['Ask anything', ...triggers].join(', ')
}

export const card = ({ ctx, model, slots, menu, plus }: CardParts) => {
  const { hasOpenLayer } = ctx.kit
  const coarse = media('(pointer: coarse)')

  const escape = () => {
    if (hasOpenLayer() || !model.running.get()) return false
    void interrupt(ctx).catch(error => model.fail(errorMessage(error)))
    return true
  }

  const keydown = (event: KeyboardEvent) => {
    if (event.isComposing) return false
    if (event.key === 'Escape') return escape()
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

  const sources = builtinSources(ctx)
  const completion = createCompletion(ctx.kit, sources)
  const editor = createEditor(ctx.kit, model.text, {
    placeholder: placeholder(model, sources),
    extensions: [completion.extension, Prec.high(EditorView.domEventHandlers({ keydown, paste, drop: hasFiles }))],
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
