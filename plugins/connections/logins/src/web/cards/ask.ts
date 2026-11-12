import { afterTyping } from '@sand/composer/contract'
import { pcHello, type wire as wireService } from '@sand/devices-contract'
import type { IconName, Kit, kit as kitService } from '@sand/ui-kit/contract'
import { joinDisposers } from '@sand/util'
import { derive, div, dynamicChild, form, sig, span, type Child, type Props, type Sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { askWaiting, type AskAnswer, type AskStatus } from '../../contract'

export type CardContext = Context<{ wire: typeof wireService; kit: typeof kitService }>

export interface Target {
  session: string
  id: string
}

type Shown = AskStatus | 'pending' | 'checking'

const statusText: Record<AskStatus, string> = {
  saved: 'saved as a login',
  held: 'held for one use, not saved',
  filled: 'code sent',
  approved: 'approved in the app',
  declined: 'declined',
  timed_out: 'not answered in time',
  cancelled: 'cancelled',
}

export const answerBook = () => {
  const book = new Map<string, Sig<AskStatus | undefined>>()
  const of = (id: string) => {
    const found = book.get(id) ?? sig<AskStatus | undefined>(undefined)
    book.set(id, found)
    return found
  }
  const record = ({ id, status }: AskAnswer) => of(id).set(status)
  return { of, record }
}

export type AnswerBook = ReturnType<typeof answerBook>

export const cardFrame = (props: Props<HTMLFormElement>, ...children: Child[]) => form({ ...props, class: 'mb-3 flex min-w-0 flex-col gap-3 px-2 py-2' }, ...children)

export const cardHead = ({ icon, metaLine, sectionTitle }: Kit, glyph: IconName, title: string, site?: string) =>
  div(
    { class: 'flex min-w-0 items-center gap-2' },
    span({ class: 'inline-flex shrink-0 text-neutral-400' }, icon(glyph, 'sm')),
    sectionTitle(title),
    site ? metaLine(site) : null,
  )

export const cardText = ({ secondaryText }: Kit, text: string) => div({ class: 'whitespace-pre-wrap wrap-anywhere' }, secondaryText(text))

export const cardActions = (...children: Child[]) => div({ class: 'flex flex-wrap justify-end gap-2' }, ...children)

const shownOf = (answer: AskStatus | undefined, waiting: boolean | undefined): Shown => {
  if (answer) return answer
  if (waiting === undefined) return 'checking'
  return waiting ? 'pending' : 'cancelled'
}

export interface AskCard {
  glyph: IconName
  label: string
  reason: string
  pending(): HTMLElement
}

export const askCard = (ctx: CardContext, answer: Sig<AskStatus | undefined>, target: Target, card: AskCard) => {
  const { icon, statusLine } = ctx.kit
  const held = sig(true)
  const waiting = sig<boolean | undefined>(undefined)
  const shown = derive(() => shownOf(answer.get(), held.get() ? undefined : waiting.get()))
  const check = () => {
    if (!answer.get()) void ctx.wire.call(askWaiting, { session: target.session }).then(found => waiting.set(found.some(asked => asked.id === target.id)), () => {})
  }
  return div(
    {
      onMount: () => {
        check()
        return joinDisposers(
          afterTyping(ctx, () => held.set(false)),
          ctx.on(pcHello, check),
        )
      },
    },
    dynamicChild(shown, state => {
      if (state === 'checking') return null
      if (state === 'pending') return card.pending()
      return div({ class: 'mb-3 px-2' }, statusLine({ mark: icon(card.glyph, 'sm'), text: `${card.label} · ${statusText[state]}`, title: card.reason }))
    }),
  )
}
