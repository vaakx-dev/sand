import { div, preventThen, sig, type Sig } from '@vaakx-dev/vrui'
import { askDecline, secretSave, type AskStatus, type SecretRequest } from '../../contract'
import { problem, task } from '../task'
import { askCard, cardActions, cardFrame, cardHead, cardText, type CardContext, type Target } from './ask'

const savedNote = 'Saved encrypted as a login, which you can manage in Settings → Logins. It never shows in the chat, and agents use it without seeing it.'
const onceNote = 'Used once, then forgotten: it is never saved and never shows in the chat, and the agent uses it without seeing it.'

const pendingCard = ({ kit, wire }: CardContext, target: Target, request: SecretRequest) => {
  const { checkRow, primaryAction, secondaryAction, textInput } = kit
  const { site, once } = request
  const username = sig('')
  const value = sig('')
  const keep = sig(!once)
  const work = task()
  const ready = () => !work.busy.get() && Boolean(value.get()) && (!site || Boolean(username.get()))
  const save = () => {
    const values = site ? { username: username.get(), password: value.get() } : { value: value.get() }
    return work.run(() => wire.call(secretSave, { ...target, save: keep.get(), ...values }))
  }
  const fields = site
    ? [
        textInput({ type: 'text', autocomplete: 'username', 'aria-label': `Username for ${site}`, placeholder: 'Username or email', bindValue: username, disabled: work.busy }, 'md'),
        textInput({ type: 'password', autocomplete: 'current-password', 'aria-label': `Password for ${site}`, placeholder: 'Password', bindValue: value, disabled: work.busy }, 'md'),
      ]
    : [textInput({ type: 'password', 'aria-label': request.title, placeholder: request.placeholder ?? '', bindValue: value, disabled: work.busy }, 'md')]
  return cardFrame(
    {
      onSubmit: preventThen(() => {
        if (ready()) void save()
      }),
    },
    cardHead(kit, site ? 'globe' : 'key', request.title, site),
    cardText(request.reason),
    ...fields,
    problem(kit, work),
    once ? checkRow({ checked: keep, onToggle: () => keep.update(on => !on), title: 'Save for later', surface: 'raised', disabled: work.busy }) : null,
    div({ class: 'text-xs text-neutral-500' }, () => (keep.get() ? savedNote : onceNote)),
    cardActions(
      secondaryAction({ disabled: work.busy, onClick: () => void work.run(() => wire.call(askDecline, target)) }, 'Decline'),
      primaryAction({ type: 'submit', disabled: () => !ready() }, () => (keep.get() ? 'Save' : 'Send')),
    ),
  )
}

export const secretCard = (ctx: CardContext, answer: Sig<AskStatus | undefined>, session: string, request: SecretRequest) => {
  const target = { session, id: request.id }
  return askCard(ctx, answer, target, { glyph: 'key', label: request.title, reason: request.reason, pending: () => pendingCard(ctx, target, request) })
}
