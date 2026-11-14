import type { WaitLine, Waiting } from '@sand/chat/contract'
import type { Kit } from '@sand/ui-kit/contract'
import { errorMessage, tildeHome } from '@sand/util'
import { derive, div, dynamicChild, sig, span } from '@vaakx-dev/vrui'
import type { Model, Question } from './model'
import { asked, choicesOf, sentence } from './question'

const questionFor = (model: Model, { thread, reason }: Waiting) =>
  derive(() => model.all.get().find(({ decision }) => decision.conversation === thread && decision.call === reason.call && decision.outcome === 'waiting'))

const answers = (kit: Kit, model: Model, question: Question) => {
  const busy = sig(false)
  const failure = sig('')
  const send = (choice: ReturnType<typeof choicesOf>[number]) => {
    busy.set(true)
    model.answer(question, choice.answer).catch(error => {
      failure.set(errorMessage(error))
      busy.set(false)
    })
  }
  return [
    ...choicesOf(question.decision).map((choice, index) => kit.quietButton({ size: 'sm', strong: index === 0, disabled: busy, onClick: () => send(choice) }, choice.label)),
    dynamicChild(failure, text => (text ? kit.errorText(text) : null)),
  ]
}

const line = (kit: Kit, model: Model, question: Question) =>
  div(
    { class: 'flex min-h-6 min-w-0 flex-wrap items-center gap-2 text-xs text-neutral-500' },
    div(
      { class: 'flex min-w-48 flex-1 items-center gap-2' },
      span({ class: 'shrink-0' }, sentence(asked(question.decision))),
      kit.monoMeta(tildeHome(question.decision.summary)),
    ),
    div({ class: 'flex shrink-0 items-center gap-1' }, ...answers(kit, model, question)),
  )

export const permissionLine = (kit: Kit, model: Model): WaitLine => ({
  kind: 'permission',
  render: waiting => {
    const found = questionFor(model, waiting)
    return div(
      { class: 'min-w-0 flex-1' },
      dynamicChild(
        derive(() => found.get()?.decision.id),
        () => {
          const question = found.get()
          return question ? line(kit, model, question) : null
        },
      ),
    )
  },
})
