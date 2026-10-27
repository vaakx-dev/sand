import { errorMessage } from '@sand/util'
import { div, input, media, span, type Sig } from '@vaakx-dev/vrui'
import type { ComposerContext } from '../context'
import { fromPaste, pasteLimit } from '../attachments/content'
import { shelf } from '../attachments/shelf'
import { createCompletion, type CompletionSource } from '../complete/model'
import { builtinSources } from '../complete/sources'
import { createEditor } from '../editor/view'
import type { Model } from '../model'
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
  dropping: Sig<boolean>
}

const placeholder = (model: Model, sources: CompletionSource[]) => () => {
  if (model.running.get()) return 'Add to the running turn'
  const triggers = sources.filter(source => source.ready()).map(source => `${source.trigger} ${source.label}`)
  return ['Ask anything', ...triggers].join(', ')
}

export const card = ({ ctx, model, slots, menu }: CardParts) => {
  const { hasOpenLayer, icon, iconButton } = ctx.kit
  const coarse = media('(pointer: coarse)')

  const keydown = (event: KeyboardEvent) => {
    if (event.isComposing) return
    if (completion.keydown(event)) return event.preventDefault()
    if (event.key === 'Escape' && hasOpenLayer()) return
    if (event.key === 'Escape' && model.running.get()) {
      event.preventDefault()
      return void interrupt(ctx).catch(error => model.fail(errorMessage(error)))
    }
    if (event.key === 'Enter' && !event.shiftKey && !coarse.get()) {
      event.preventDefault()
      void model.send()
    }
  }

  const paste = (event: ClipboardEvent) => {
    const pasted = event.clipboardData?.getData('text/plain') ?? ''
    if (pasted.length <= pasteLimit) return
    event.preventDefault()
    model.files.attach([fromPaste(pasted)])
  }

  const sources = builtinSources(ctx)
  const editor = createEditor(ctx.kit, model.segments, { placeholder: placeholder(model, sources), keydown, paste })
  const completion = createCompletion(ctx.kit, editor.node, editor.active, sources)

  const picker = input({
    type: 'file',
    multiple: true,
    hidden: true,
    onChange: () => {
      void model.files.add(picker.files ?? [])
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
      iconButton({ surface: 'raised', title: 'Attach files', 'aria-label': 'Attach files', class: '-ml-2', onClick: choose }, icon('plus', 'md')),
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
