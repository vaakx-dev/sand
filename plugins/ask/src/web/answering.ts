import type { AskAnswer, Composer, ComposerCapture } from '@sand/protocol'
import type { Context } from 'drydock'
import { choicesOf } from '../choices'
import { askBanner } from './banner/panel'
import type { PendingAsk } from './pending'
import { createState, type AskState } from './state'

export interface AskActions {
  go(index: number): void
  pick(index: number): void
  move(from: number, to: number): void
  skip(): void
}

const advanceDelay = 220

const placeholder = (state: AskState) => {
  const { name, type } = state.question.get()
  return type === 'text' ? 'Type your answer…' : `Something else for ${name}…`
}

const digit = (event: KeyboardEvent) => !event.altKey && !event.ctrlKey && !event.metaKey && /^[1-9]$/.test(event.key)

export const openAsk = (ctx: Context<'wire'>, composer: Composer, ask: PendingAsk) => {
  const state = createState(ask.questions)
  let live = true

  const send = async (answers: AskAnswer[] | null) => {
    if (state.sending.get()) return
    state.sending.set(true)
    try {
      await ctx.wire.call({ type: 'ask.answer', session: ask.thread, call: ask.call, answers })
    } finally {
      if (live) state.sending.set(false)
    }
  }

  const go = (index: number) => {
    if (index < 0 || index >= ask.questions.length || index === state.current.get()) return
    state.go(index)
    const text = state.draft.get().text
    if (composer.value() !== text) composer.set(text)
  }

  const pick = (index: number) => {
    const at = state.current.get()
    state.pick(index)
    if (composer.value()) composer.set('')
    if (state.question.get().type === 'multi' || state.finishing.get()) return
    setTimeout(() => live && state.current.get() === at && go(at + 1), advanceDelay)
  }

  const actions: AskActions = { go, pick, move: state.move, skip: () => void send(null) }

  const capture: ComposerCapture = {
    placeholder: () => placeholder(state),
    title: () => (state.finishing.get() ? 'Submit answers' : 'Next question'),
    icon: () => (state.finishing.get() ? 'check' : 'right'),
    input: text => state.write(text),
    keydown(event) {
      if (event.altKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        go(state.current.get() + (event.key === 'ArrowLeft' ? -1 : 1))
        return true
      }
      const question = state.question.get()
      if (!digit(event) || composer.value() || question.type === 'text' || question.type === 'rank') return false
      const index = Number(event.key) - 1
      if (index >= choicesOf(question).length) return false
      pick(index)
      return true
    },
    async send() {
      if (state.finishing.get()) return send(state.answers())
      go(state.current.get() + 1)
    },
  }

  const disposers = [composer.slot('banner', () => askBanner(state, actions), 10), composer.capture(capture)]
  return () => {
    live = false
    disposers.forEach(dispose => void dispose())
  }
}
