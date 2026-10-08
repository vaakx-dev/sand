import { oneLine } from '@sand/kit'

const maxLength = 80

const firstSentence = (text: string) => /^.*?[.!?](?=\s|$)/.exec(text)?.[0]

export const agentTitle = (label: string | undefined, task: string) => {
  const named = oneLine(label ?? '', Infinity)
  const flatTask = oneLine(task, Infinity)
  return oneLine(named || firstSentence(flatTask) || flatTask, maxLength - 1)
}
