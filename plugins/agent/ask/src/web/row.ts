import type { ToolBadge, ToolRenderer, ToolView } from '@sand/transcript-chat/contract'
import type { ToolViews } from '@sand/transcript-parts/contract'
import { div, span } from '@sand/dom'
import { ownPrefix, skippedAnswer, skippedReply } from '../choices'
import { questionsOf } from './pending'

const shortAnswer = 32

const answersOf = (tool: ToolView, text: string) => {
  const lines = text.split('\n')
  return questionsOf(tool.call.input).map(question => {
    const line = lines.find(candidate => candidate.startsWith(`${question.name}: `))
    return { name: question.name, answer: line ? line.slice(question.name.length + 2) : skippedAnswer }
  })
}

const answerCell = (answer: string) => {
  if (answer === skippedAnswer) return span({ class: 'text-neutral-500' }, 'Skipped')
  if (!answer.startsWith(ownPrefix)) return span({ class: 'wrap-anywhere text-neutral-200' }, answer)
  return span({ class: 'wrap-anywhere text-neutral-200' }, span({ class: 'text-neutral-500' }, 'Own answer: '), answer.slice(ownPrefix.length))
}

export const askRenderer = ({ errorBody, resultText }: ToolViews): ToolRenderer => {
  const skipped = (tool: ToolView) => resultText(tool.result) === skippedReply
  return {
    icon: 'help',
    verb: 'Asked',
    activeVerb: 'Asking',
    label(tool) {
      const questions = questionsOf(tool.call.input)
      return questions.length === 1 ? questions[0]!.question : `${questions.length} questions`
    },
    badge(tool): ToolBadge | undefined {
      if (!tool.result) return { text: 'waiting', tone: 'neutral' }
      if (tool.result.isError) return { text: 'not answered', tone: 'danger' }
      if (skipped(tool)) return { text: 'skipped', tone: 'neutral' }
      const answers = answersOf(tool, resultText(tool.result))
      const only = answers.length === 1 ? answers[0]!.answer : ''
      return only && only.length <= shortAnswer && !only.startsWith(ownPrefix) ? { text: only, tone: 'success' } : { text: 'answered', tone: 'success' }
    },
    copy: tool => resultText(tool.result),
    body(tool) {
      if (!tool.result) return undefined
      if (tool.result.isError) return errorBody(tool)
      if (skipped(tool)) return undefined
      return div(
        { class: 'grid gap-x-4 gap-y-1 text-sm', style: { gridTemplateColumns: 'auto 1fr' } },
        ...answersOf(tool, resultText(tool.result)).flatMap(({ name, answer }) => [span({ class: 'text-neutral-500' }, name), answerCell(answer)]),
      )
    },
  }
}
