import type { ContextUsage } from '@sand/compaction/contract'
import type { CompletionSource } from './contract'
import { derive, div, dropdown, errorMessage, hasOpenLayer, icon, iconButton, input, media, show, SPACE, span, textarea, type Derive, type Sig } from '@sand/dom'
import type { Context } from 'drydock'
import { agentsChip } from './agents/chip'
import { fromPaste, pasteLimit } from './attachments/content'
import { shelf } from './attachments/shelf'
import { createCompletion } from './complete'
import { builtinSources } from './complete/sources'
import { glassPanel } from './components/glass'
import { contextDetails, contextRing } from './context/ring'
import { autosize } from './integrations/autosize'
import type { Model } from './model'
import { sendControl } from './send/button'
import { interrupt } from './send/submit'
import type { Slots } from './slots'

export interface CardParts {
  ctx: Context<'threads' | 'turns'>
  model: Model
  slots: Slots
  sources: () => CompletionSource[]
  dropping: Sig<boolean>
}

const placeholder = (model: Model) => () => {
  const capture = model.capture.get()
  if (capture) return capture.placeholder()
  if (model.editing.get()) return 'Edit the queued message'
  if (model.idle.get()) return 'Start a new thread'
  if (!model.running.get()) return 'Ask sand anything'
  return model.mode.get() === 'queue' ? 'Queue a follow-up' : 'Add to the running turn'
}

const usageOf = (ctx: Context<'threads'>) => ctx.threads.current()?.context

const moreMenu = (parts: CardParts, usage: Derive<ContextUsage | undefined>) =>
  show(usage.map(Boolean), () =>
    dropdown({
      placement: 'above-right',
      keepFocus: true,
      menuClass: 'w-64',
      trigger: (toggle, open) => iconButton({ title: 'More', active: open, onClick: toggle }, icon('more', 16)),
      items: close => [contextDetails(parts.ctx, usage, close, parts.model.fail)],
    }),
  )

export const card = (parts: CardParts) => {
  const { ctx, model, slots, dropping } = parts
  const coarse = media('(pointer: coarse)')
  const phone = media('(max-width: 760px)')
  const usage = model.changes.read(() => usageOf(ctx))

  const field = textarea({
    rows: 1,
    enterKeyHint: 'enter',
    bindValue: model.text,
    placeholder: placeholder(model),
    class: 'block max-h-48 min-h-8 w-full resize-none bg-transparent px-1 text-base text-neutral-100 outline-none md:text-sm',
    style: { lineHeight: '1.65' },
    onKeyDown: event => keydown(event),
    onPaste: event => {
      const pasted = event.clipboardData?.getData('text/plain') ?? ''
      if (pasted.length <= pasteLimit) return
      event.preventDefault()
      model.files.attach([fromPaste(pasted)])
    },
  })
  autosize(field, model.text)

  const completion = createCompletion(field, parts.sources, () => void model.send())

  const keydown = (event: KeyboardEvent) => {
    if (event.isComposing) return
    if (completion.keydown(event)) return event.preventDefault()
    if (model.capture.get()?.keydown?.(event)) return event.preventDefault()
    if (event.key === 'Escape' && hasOpenLayer()) return
    if (event.key === 'Escape' && model.editing.get()) {
      event.preventDefault()
      return model.cancelEdit()
    }
    if (event.key === 'Escape' && model.running.get()) {
      event.preventDefault()
      return void interrupt(ctx).catch(error => model.fail(errorMessage(error)))
    }
    if (event.key === 'Enter' && !event.shiftKey && !coarse.get()) {
      event.preventDefault()
      void model.send()
    }
  }

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
    shelf(model.files),
    agentsChip(model.working),
    field,
    div(
      { class: 'flex h-10 min-w-0 items-center gap-1' },
      span({ class: 'inline-flex', style: { marginLeft: `calc(-1 * ${SPACE['2']})` } }, iconButton({ title: 'Attach files', onClick: choose }, icon('plus', 18))),
      slots.host('start', 'flex min-w-0 shrink items-center gap-1'),
      span({ class: 'min-w-2 flex-1' }),
      slots.host('end', 'flex min-w-0 shrink items-center gap-1'),
      show(derive(() => !phone.get()), () => contextRing(ctx, usage, model.fail)),
      show(phone, () => moreMenu(parts, usage)),
      sendControl(model),
    ),
    picker,
  )

  return { node, field, completion, choose }
}

export type Card = ReturnType<typeof card>

export const defaultSources = (ctx: Context<'threads'>, extra: Set<CompletionSource>) => () => [...extra, ...builtinSources(ctx)]
