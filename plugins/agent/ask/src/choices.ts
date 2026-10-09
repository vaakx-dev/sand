import type { AskAnswer, AskOption, AskQuestion } from '@sand/protocol'

export const toolName = 'ask'

export const skippedReply = 'The user skipped the questions. Carry on with your best judgement and say what you assumed.'

export const ownPrefix = '(own answer) '

export const skippedAnswer = '(skipped)'

const yesNo: AskOption[] = [{ label: 'Yes' }, { label: 'No' }]

export const choicesOf = (question: AskQuestion) => (question.type === 'confirm' && question.options.length !== 2 ? yesNo : question.options)

const picks = (question: AskQuestion, answer: AskAnswer) => {
  const choices = choicesOf(question)
  return (answer.picked ?? []).flatMap(index => choices[index]?.label ?? [])
}

const answerText = (question: AskQuestion, answer: AskAnswer | undefined) => {
  const own = answer?.text?.trim()
  if (own) return question.type === 'text' ? own : `${ownPrefix}${own}`
  const labels = answer ? picks(question, answer) : []
  if (!labels.length || question.type === 'text') return skippedAnswer
  if (question.type === 'rank') return labels.join(' > ')
  return question.type === 'multi' ? labels.join(', ') : labels[0]!
}

export const replyText = (questions: AskQuestion[], answers: AskAnswer[] | null) => {
  if (!answers) return skippedReply
  const lines = questions.map((question, index) => ({ question, text: answerText(question, answers[index]) }))
  if (lines.every(line => line.text === skippedAnswer)) return skippedReply
  return lines.map(line => `${line.question.name}: ${line.text}`).join('\n')
}
