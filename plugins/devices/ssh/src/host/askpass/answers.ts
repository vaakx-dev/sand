import type { SshPrompt } from '../../contract'
import type { Asker } from './bridge'
import { isSavable, promptKind, shownPrompt } from './prompt'

export interface AnswerSources {
  saved?: Record<string, string>
  ask?: (prompt: SshPrompt) => Promise<string | null>
  notice?: (text: string) => void
  rejected?: (text: string) => void
}

export interface Answers {
  process(): Asker
  needsYou(): string | undefined
  kept(): Record<string, string>
}

export const createAnswers = ({ saved = {}, ask, notice, rejected }: AnswerSources): Answers => {
  const known = new Map(Object.entries(saved))
  let unanswered: string | undefined

  const process = (): Asker => {
    const given = new Set<string>()
    let declined = false
    return async (text, askpass) => {
      const kind = promptKind(text, askpass)
      if (kind === 'notice') {
        notice?.(text.trim())
        return ''
      }
      if (declined) return null
      const value = known.get(text)
      if (value !== undefined && !given.has(text)) {
        given.add(text)
        return value
      }
      if (value !== undefined) {
        known.delete(text)
        rejected?.(text)
      }
      if (!ask) {
        unanswered ??= text.trim()
        return null
      }
      const answer = await ask(shownPrompt(kind, text))
      declined = answer === null
      if (answer === null) return null
      given.add(text)
      if (isSavable(kind)) known.set(text, answer)
      return answer
    }
  }

  return { process, needsYou: () => unanswered, kept: () => Object.fromEntries(known) }
}
