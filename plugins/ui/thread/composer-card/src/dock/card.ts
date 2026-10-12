import { errorMessage } from '@sand/kit'
import { hasOpenLayer } from '@sand/kit/web'
import type {} from '@sand/ui-kit/contract'
import { div, input, media, span, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { agentsChip } from '../agents/chip'
import { fromPaste, pasteLimit } from '../attachments/content'
import { shelf } from '../attachments/shelf'
import { createCompletion } from '../complete/model'
import { builtinSources } from '../complete/sources'
import { createEditor } from '../editor/view'
import type { Model } from '../model'
import { sendControl } from '../send/button'
import type { SendMenu } from '../send/menu'
import { interrupt } from '../send/submit'
import { glassPanel } from './glass'
import type { Slots } from './slots'

export interface CardParts {
  ctx: Context<'threads' | 'turns' | 'kit'>
  model: Model
  slots: Slots
  menu: SendMenu
  dropping: Sig<boolean>
}

const placeholder = (model: Model) => () => {
  const capture = model.capture.get()
  if (capture) return capture.placeholder()
  if (model.idle.get()) return 'Start a new thread'
  return model.running.get() ? 'Add to the running turn' : 'Ask sand anything'
}

export const card = ({ ctx, model, slots, menu, dropping }: CardParts) => {
  const { icon, iconButton } = ctx.kit
  const coarse = media('(pointer: coarse)')

  const keydown = (event: KeyboardEvent) => {
    if (event.isComposing) return
    if (completion.keydown(event)) return event.preventDefault()
    if (model.capture.get()?.keydown?.(event)) return event.preventDefault()
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

  const editor = createEditor(ctx.kit, model.segments, { placeholder: placeholder(model), keydown, paste })
  const completion = createCompletion(editor.node, editor.active, builtinSources(ctx), () => void model.send())

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
    { tint: () => (dropping.get() ? 'accent' : 'plain'), class: 'relative rounded-2xl px-3 pt-3' },
    slots.host('above', 'mb-2 flex flex-col gap-1'),
    shelf(ctx, model.files),
    agentsChip(ctx.kit, model.working),
    editor.node,
    div(
      { class: 'flex h-10 min-w-0 items-center gap-1' },
      span({ class: 'inline-flex -ml-2' }, iconButton({ title: 'Attach files', onClick: choose }, icon('plus', 16))),
      slots.host('start', 'flex min-w-0 shrink items-center gap-1'),
      span({ class: 'min-w-2 flex-1' }),
      slots.host('end', 'flex min-w-0 shrink items-center gap-1'),
      sendControl(ctx.kit, model, menu),
    ),
    picker,
  )

  return { node, editor, completion, choose }
}

export type Card = ReturnType<typeof card>
