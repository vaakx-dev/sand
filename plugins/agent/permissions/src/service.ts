import type { ConversationRef, Engine } from '@sand/engine/contract'
import type { Answer, Decision, ModeState, Permissions } from './contract'
import type { Questions } from './questions'
import type { Scopes } from './scope'
import type { Stores } from './store'

export interface ServiceDeps {
  stores: Stores
  scopes: Scopes
  questions: Questions
  engine: Engine
  tx<T>(fn: () => T): T
  title(conversation: ConversationRef): string
  questionsChanged(): void
  modeChanged(conversation: ConversationRef): void
  settingsChanged(): void
}

const RECENT_DECISIONS = 30

const lateNote = ({ tool, summary }: Decision) =>
  `The user allowed your earlier ${tool} call after its deadline had passed: ${summary}\nYou may now make that exact call once more if it is still needed.`

const refOf = ({ owner, conversation }: Decision): ConversationRef => ({ owner, id: conversation })

export const createService = (deps: ServiceDeps): Permissions => {
  const { stores, scopes, questions } = deps

  const live = ({ owner, turn }: Decision) => {
    const info = deps.engine.turn(owner, turn)
    return info !== undefined && info.ended === undefined
  }

  const modeOf = (conversation: ConversationRef): ModeState => {
    const { mode, strict, from } = scopes(conversation)
    return { mode, strict, ...(from && { from }) }
  }

  const saveRule = (decision: Decision) => {
    const { home } = scopes(refOf(decision))
    return stores.rules.add({ owner: home.owner, conversation: home.id, title: deps.title(home), tool: decision.tool, verdict: 'allow' })
  }

  const ruleFor = (decision: Decision, answer: Answer) => (answer === 'always' && !decision.once ? saveRule(decision) : undefined)

  const answerLate = (decision: Decision, answer: Answer) => {
    const settled = deps.tx(() => {
      const rule = answer === 'deny' ? undefined : ruleFor(decision, answer)
      const done = stores.decisions.answerLate(decision.id, answer === 'deny' ? 'dismissed' : 'allowed')
      if (!done) throw new Error('This call was already answered')
      return { done, rule }
    })
    if (settled.done.late === 'allowed')
      void deps.engine.send(refOf(decision), { prompt: lateNote(decision), origin: 'wake', clientRequestId: `permission-late-${decision.id}` })?.catch(() => {})
    return settled
  }

  const answerNow = (decision: Decision, answer: Answer) =>
    deps.tx(() => {
      const rule = answer === 'deny' ? undefined : ruleFor(decision, answer)
      const done = stores.decisions.settle(decision.id, { outcome: answer === 'deny' ? 'denied' : 'allowed', by: 'owner', ...(rule && { rule: rule.id }) })
      if (!done) throw new Error('This call is no longer waiting for an answer')
      return { done, rule }
    })

  return {
    mode: modeOf,
    setMode(conversation, mode) {
      stores.modes.set(conversation, mode)
      deps.modeChanged(conversation)
      deps.settingsChanged()
      return modeOf(conversation)
    },
    questions: () => stores.decisions.open().filter(decision => decision.outcome !== 'waiting' || live(decision)),
    answer(id, answer) {
      const found = stores.decisions.get(id)
      if (!found) throw new Error('No such question')
      const { done, rule } = found.outcome === 'expired' ? answerLate(found, answer) : answerNow(found, answer)
      questions.answered(id)
      deps.questionsChanged()
      if (rule) deps.settingsChanged()
      return done
    },
    decisions: query => stores.decisions.list(query),
    settings: () => ({
      deadlineMinutes: stores.settings.deadlineMinutes(),
      modes: stores.modes.list(),
      rules: stores.rules.list(),
      decisions: stores.decisions.list({ limit: RECENT_DECISIONS }),
    }),
    removeRule(id) {
      if (stores.rules.remove(id)) deps.settingsChanged()
    },
    setDeadline(minutes) {
      stores.settings.setDeadlineMinutes(minutes)
      deps.settingsChanged()
    },
  }
}
