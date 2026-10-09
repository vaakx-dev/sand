import type { AskAnswer, AskQuestion } from '@sand/protocol'
import { derive, sig } from '@sand/dom'

export interface Draft {
  picked: number[]
  text: string
}

const fresh = (question: AskQuestion): Draft => ({ picked: question.type === 'rank' ? question.options.map((_, index) => index) : [], text: '' })

const isAnswered = (question: AskQuestion, draft: Draft, seen: boolean) => {
  if (draft.text.trim()) return true
  if (question.type === 'rank') return seen
  return question.type !== 'text' && draft.picked.length > 0
}

export const createState = (questions: AskQuestion[]) => {
  const drafts = sig(questions.map(fresh))
  const current = sig(0)
  const seen = sig(new Set([0]))
  const open = sig(true)
  const sending = sig(false)
  const question = derive(() => questions[current.get()]!)
  const draft = derive(() => drafts.get()[current.get()]!)
  const answered = (index: number) => isAnswered(questions[index]!, drafts.get()[index]!, seen.get().has(index))
  const complete = derive(() => questions.every((_, index) => answered(index)))
  const last = derive(() => current.get() === questions.length - 1)
  const finishing = derive(() => complete.get() || last.get())

  const go = (index: number) => {
    current.set(index)
    seen.update(set => new Set([...set, index]))
  }

  const update = (index: number, change: (draft: Draft) => Draft) => drafts.update(list => list.map((draft, at) => (at === index ? change(draft) : draft)))

  const pick = (index: number) =>
    update(current.get(), draft => {
      if (question.get().type !== 'multi') return { ...draft, picked: [index] }
      const picked = draft.picked.includes(index) ? draft.picked.filter(other => other !== index) : [...draft.picked, index].sort((a, b) => a - b)
      return { ...draft, picked }
    })

  const move = (from: number, to: number) =>
    update(current.get(), draft => {
      const picked = [...draft.picked]
      const [moved] = picked.splice(from, 1)
      picked.splice(Math.max(0, Math.min(to, picked.length)), 0, moved!)
      return { ...draft, picked }
    })

  const write = (text: string) => update(current.get(), draft => (draft.text === text ? draft : { ...draft, text }))

  const answers = (): AskAnswer[] => drafts.get().map(draft => (draft.text.trim() ? { text: draft.text.trim() } : { picked: draft.picked }))

  return { questions, drafts, current, open, sending, question, draft, answered, complete, finishing, go, pick, move, write, answers }
}

export type AskState = ReturnType<typeof createState>
