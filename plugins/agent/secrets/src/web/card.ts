import { pcHello, type wire as wireService } from '@sand/devices-contract'
import type { Kit, kit as kitService } from '@sand/ui-kit/contract'
import { errorMessage, joinDisposers } from '@sand/util'
import { threadChange, type Thread, type threads as threadsService } from '@sand/web-client/contract'
import { derive, div, dynamicChild, form, preventThen, resource, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { answerEntry, secretDecline, secretSave, secretWaiting, type SecretAnswer, type SecretRequest, type SecretStatus } from '../contract'

type CardContext = Context<{ wire: typeof wireService; kit: typeof kitService; threads: typeof threadsService }>

type Shown = SecretStatus | 'pending' | 'checking'

const statusText: Record<SecretStatus, string> = {
  saved: 'saved to a private file',
  declined: 'declined',
  timed_out: 'not answered in time',
  cancelled: 'cancelled',
}

const note = "Goes to a private file on this PC that the agent's commands can read for a day. It never shows in the chat. Don't commit it."

const answerIn = (thread: Thread | undefined, id: string) => {
  for (const entry of thread?.entries.values() ?? []) {
    const answer = entry.data as SecretAnswer
    if (entry.type === answerEntry && answer.id === id) return answer.status
  }
  return undefined
}

const shownOf = (answer: SecretStatus | undefined, waiting: boolean | undefined): Shown => {
  if (answer) return answer
  if (waiting === undefined) return 'checking'
  return waiting ? 'pending' : 'cancelled'
}

const statusRow = ({ icon, statusLine }: Kit, request: SecretRequest, status: SecretStatus) =>
  div({ class: 'mb-3 px-2' }, statusLine({ mark: icon('key', 'sm'), text: `${request.title} · ${statusText[status]}`, title: request.reason }))

const pendingCard = ({ kit, wire }: CardContext, session: string, request: SecretRequest) => {
  const { errorText, icon, primaryAction, secondaryAction, textInput } = kit
  const target = { session, id: request.id }
  const value = sig('')
  const busy = sig(false)
  const failure = sig('')
  const send = (call: () => Promise<void>) => {
    busy.set(true)
    failure.set('')
    call().catch(error => {
      failure.set(errorMessage(error))
      busy.set(false)
    })
  }
  return form(
    {
      class: 'mb-3 flex flex-col gap-3 rounded-xl bg-neutral-900 p-3 ring-1 ring-neutral-800',
      onSubmit: preventThen(() => send(() => wire.call(secretSave, { ...target, value: value.get() }))),
    },
    div({ class: 'flex items-center gap-2 text-sm font-medium text-neutral-100' }, icon('key', 'sm'), request.title),
    div({ class: 'text-sm whitespace-pre-wrap wrap-anywhere text-neutral-400' }, request.reason),
    textInput({ type: 'password', 'aria-label': request.title, placeholder: request.placeholder ?? '', bindValue: value, disabled: busy }, 'md'),
    dynamicChild(failure, text => (text ? errorText(text) : null)),
    div({ class: 'text-xs text-neutral-500' }, note),
    div(
      { class: 'flex justify-end gap-2' },
      secondaryAction({ disabled: busy, onClick: () => send(() => wire.call(secretDecline, target)) }, 'Decline'),
      primaryAction({ type: 'submit', disabled: () => busy.get() || !value.get() }, 'Save'),
    ),
  )
}

export const secretCard = (ctx: CardContext, session: string, request: SecretRequest) => {
  const answered = () => answerIn(ctx.threads.get(session), request.id)
  const answer = sig(answered())
  const waiting = resource(() => ctx.wire.call(secretWaiting, { session, id: request.id }), { lazy: true })
  const shown = derive(() => shownOf(answer.get(), waiting.data.get()))
  const check = () => {
    if (!answer.get()) waiting.refetch()
  }
  return div(
    {
      onMount: () => {
        check()
        return joinDisposers(
          ctx.on(threadChange, id => {
            if (id === session && !answer.get()) answer.set(answered())
          }),
          ctx.on(pcHello, check),
        )
      },
    },
    dynamicChild(shown, state => {
      if (state === 'checking') return null
      if (state === 'pending') return pendingCard(ctx, session, request)
      return statusRow(ctx.kit, request, state)
    }),
  )
}
