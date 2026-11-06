import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage } from '@sand/util'
import { derive, div, dynamicChild, media, show, sig, span, textarea } from '@vaakx-dev/vrui'
import { column } from '../pane'

export interface ComposerParts {
  name: () => string
  working: () => boolean
  send(text: string): Promise<void>
  interrupt(): Promise<void>
}

type Look = 'off' | 'send' | 'stop' | 'busy'

const idle = 'cursor-default bg-neutral-700/60 text-neutral-500'

const titles: Record<Look, string> = { off: 'Send', send: 'Send', stop: 'Stop', busy: 'Sending' }

const typing = 'text-base leading-relaxed whitespace-pre-wrap wrap-anywhere md:text-sm'

export const composer = (kit: Kit, { name, working, send, interrupt }: ComposerParts) => {
  const { actionTones, errorText, icon, plainButton, spinner } = kit
  const text = sig('')
  const sending = sig(false)
  const failure = sig<string | undefined>(undefined)
  const coarse = media('(pointer: coarse)')
  const look = derive((): Look => {
    if (sending.get()) return 'busy'
    if (text.get().trim()) return 'send'
    return working() ? 'stop' : 'off'
  })
  const tones: Record<Look, string> = { off: idle, send: actionTones.primary, stop: actionTones.secondary, busy: idle }

  const submit = () => {
    const value = text.get().trim()
    if (!value || sending.get()) return
    sending.set(true)
    failure.set(undefined)
    text.set('')
    send(value).then(
      () => sending.set(false),
      error => {
        sending.set(false)
        failure.set(errorMessage(error))
        if (!text.get()) text.set(value)
      },
    )
  }

  const keydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing || coarse.get()) return
    event.preventDefault()
    submit()
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
      class: ['absolute inset-0 block h-full w-full resize-none overflow-auto bg-transparent py-2 text-neutral-100 outline-none placeholder:text-neutral-500', typing],
    }),
  )

  const stop = () => void interrupt().catch(error => failure.set(errorMessage(error)))

  const press = () => (look.get() === 'stop' ? stop() : submit())

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

  return div(
    { class: 'shrink-0 px-3 pb-3 md:px-4' },
    div(
      { class: [column, 'flex flex-col gap-2'] },
      show(
        () => Boolean(failure.get()),
        () => div({ class: 'px-2' }, errorText(() => failure.get() ?? '')),
      ),
      div({ class: 'flex items-end gap-2 rounded-xl bg-neutral-800 py-1 pr-1 pl-4' }, field, sendButton),
    ),
  )
}
