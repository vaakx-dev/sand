import { oneLine } from '@sand/util'

const maxLength = 80

const firstSentence = (text: string) => /^.*?[.!?](?=\s|$)/.exec(text)?.[0]

export const agentTitle = (label: string | undefined, task: string) => {
  const named = oneLine(label ?? '')
  const flatTask = oneLine(task)
  return oneLine(named || firstSentence(flatTask) || flatTask, maxLength - 1)
}
