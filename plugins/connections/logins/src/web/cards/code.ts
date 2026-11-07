import { preventThen, sig, type Sig } from '@vaakx-dev/vrui'
import { askDecline, codeAnswer, type AskStatus, type CodeRequest } from '../../contract'
import { problem, task } from '../task'
import { askCard, cardActions, cardFrame, cardHead, cardText, type CardContext, type Target } from './ask'

const pendingCard = ({ kit, wire }: CardContext, target: Target, request: CodeRequest) => {
  const { primaryAction, quietButton, secondaryAction, textInput } = kit
  const code = sig('')
  const work = task()
  const send = (answer: { code: string } | { approved: true }) => void work.run(() => wire.call(codeAnswer, { ...target, ...answer }))
  const ready = () => !work.busy.get() && Boolean(code.get().trim())
  return cardFrame(
    {
      onSubmit: preventThen(() => {
        if (ready()) send({ code: code.get().trim() })
      }),
    },
    cardHead(kit, 'shield', request.name, request.site),
    cardText(request.prompt),
    textInput(
      {
        type: 'text',
        inputMode: 'numeric',
        autocomplete: 'one-time-code',
        enterKeyHint: 'send',
        'aria-label': `Sign-in code for ${request.name}`,
        placeholder: 'Code',
        bindValue: code,
        disabled: work.busy,
        onMount: node => node.focus(),
      },
      'md',
    ),
    problem(kit, work),
    cardActions(
      quietButton({ disabled: work.busy, onClick: () => void work.run(() => wire.call(askDecline, target)) }, 'Cancel'),
      secondaryAction({ disabled: work.busy, onClick: () => send({ approved: true }) }, 'Approved in my app'),
      primaryAction({ type: 'submit', disabled: () => !ready() }, 'Send code'),
    ),
  )
}

export const codeCard = (ctx: CardContext, answer: Sig<AskStatus | undefined>, session: string, request: CodeRequest) => {
  const target = { session, id: request.id }
  return askCard(ctx, answer, target, {
    glyph: 'shield',
    label: `${request.name} sign-in code`,
    reason: request.prompt,
    pending: () => pendingCard(ctx, target, request),
  })
}
