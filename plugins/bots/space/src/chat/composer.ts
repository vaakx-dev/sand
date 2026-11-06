import { promptOf, type Held, type Shelves } from '@sand/attachments/web/contract'
import type { Prompt } from '@sand/chats/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, media, show, sig, span, textarea, type Derive } from '@vaakx-dev/vrui'
import { column } from '../pane'

export interface ComposerParts {
  name: () => string
  working: () => boolean
  shelves: Derive<Shelves | undefined>
  send(prompt: Prompt): Promise<void>
  interrupt(): Promise<void>
}

type Look = 'off' | 'send' | 'stop' | 'busy'

const idle = 'cursor-default bg-neutral-700/60 text-neutral-500'

const titles: Record<Look, string> = { off: 'Send', send: 'Send', stop: 'Stop', busy: 'Sending' }

const typing = 'text-base leading-relaxed whitespace-pre-wrap wrap-anywhere md:text-sm'

const nowhere = { device: () => undefined, thread: () => undefined }

export const composer = (kit: Kit, { name, working, shelves, send, interrupt }: ComposerParts) => {
  const { actionTones, errorText, icon, iconButton, plainButton, spinner } = kit
  const text = sig('')
  const attached = sig<Held[]>([])
  const shelf = derive(() => shelves.get()?.create(attached, nowhere))
  const sending = sig(false)
  const failure = sig<string | undefined>(undefined)
  const coarse = media('(pointer: coarse)')
  const attachments = () => (shelf.get() ? attached.get() : [])
  const attachable = () => Boolean(shelf.get()?.attachable())
  const look = derive((): Look => {
    if (sending.get()) return 'busy'
    if (shelf.get()?.rejected()) return 'off'
    if (text.get().trim() || attachments().length) return 'send'
    return working() ? 'stop' : 'off'
  })
  const tones: Record<Look, string> = { off: idle, send: actionTones.primary, stop: actionTones.secondary, busy: idle }

  const submit = async () => {
    if (look.get() !== 'send') return
    const value = text.get().trim()
    const items = attachments()
    sending.set(true)
    failure.set(undefined)
    try {
      const content = (await shelf.get()?.upload()) ?? []
      text.set('')
      attached.set([])
      await send(promptOf(value, content))
    } catch (error) {
      failure.set(errorMessage(error))
      if (!text.get()) text.set(value)
      if (!attached.get().length) attached.set(items)
    } finally {
      sending.set(false)
    }
  }

  const keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || coarse.get()) return
    event.preventDefault()
    void submit()
  }

  const paste = (event: ClipboardEvent) => {
    if (shelf.get()?.paste(event.clipboardData?.getData('text/plain') ?? '')) event.preventDefault()
  }

  const field = div(
    { class: 'relative max-h-48 min-w-0 flex-1 overflow-hidden py-2' },
    span({ class: ['block opacity-0', typing], 'aria-hidden': 'true' }, () => `${text.get()} `),
    textarea({
      rows: 1,
      bindValue: text,
      placeholder: () => `Message ${name()}`,
      'aria-label': () => `Message ${name()}`,
      enterKeyHint: 'send',
      onKeyDown: keydown,
      onPaste: paste,
      class: ['absolute inset-0 block h-full w-full resize-none overflow-auto bg-transparent py-2 text-neutral-100 outline-none placeholder:text-neutral-500', typing],
    }),
  )

  const attachButton = show(attachable, () =>
    iconButton({ surface: 'raised', title: 'Attach files', 'aria-label': 'Attach files', onClick: () => shelf.get()?.pick() }, icon('plus', 'md')),
  )

  const stop = () => void interrupt().catch(error => failure.set(errorMessage(error)))

  const press = () => (look.get() === 'stop' ? stop() : void submit())

  const sendButton = plainButton(
    {
      title: () => titles[look.get()],
      'aria-label': () => titles[look.get()],
      'aria-disabled': () => String(look.get() === 'off' || look.get() === 'busy'),
      class: ['flex h-10 w-10 shrink-0 items-center justify-center rounded-full', () => tones[look.get()]],
      onClick: press,
    },
    dynamicChild(look, shown => {
      if (shown === 'busy') return spinner('md')
      return shown === 'stop' ? icon('stop', 'md', true) : icon('up', 'md')
    }),
  )

  const view: HTMLElement = div(
    { class: 'shrink-0 px-3 pb-3 md:px-4' },
    div(
      { class: [column, 'flex flex-col gap-2'] },
      show(
        () => Boolean(failure.get()),
        () => div({ class: 'px-2' }, errorText(() => failure.get() ?? '')),
      ),
      div(
        { class: 'flex flex-col rounded-xl bg-neutral-800' },
        dynamicChild(shelf, found => (found ? div({ class: 'px-3 pt-3', hidden: () => !attached.get().length }, found.view()) : null)),
        div({ class: ['flex items-end gap-2 py-1 pr-1', () => (attachable() ? 'pl-1' : 'pl-4')] }, attachButton, field, sendButton),
      ),
    ),
    dynamicChild(shelf, found => found?.drops(() => view.parentElement) ?? null),
  )
  return view
}
