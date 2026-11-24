import type { AppAside, AppAsk, AppOutput, AppSession, Effort, HandoffBlock } from '@sand/accounts/contract'
import type { ModelContent, StopReason, ToolResultBlock } from '@sand/chats/contract'

interface Wire {
  id?: string
  pid?: number
  prompt(content: ModelContent[], effort?: Effort): void
  steer?(content: ModelContent[]): void
  stop(): void
  close(): Promise<void>
  inject?(handoff: HandoffBlock): Promise<boolean>
  aside?(ask: AppAsk, signal?: AbortSignal): Promise<AppAside>
}

class Turns {
  private readonly answers = new Map<string, PromiseWithResolvers<ToolResultBlock>>()
  private running = false
  private stopped: PromiseWithResolvers<void> | undefined

  constructor(private readonly output: AppOutput) {}

  get stopping() {
    return !!this.stopped
  }

  result(id: string) {
    return this.answerFor(id).promise
  }

  finish(stopReason?: StopReason) {
    if (this.ended()) this.output.finish(stopReason)
  }

  fail(error: unknown) {
    if (this.ended()) this.output.fail(error)
  }

  session({ prompt, steer, stop, close, ...rest }: Wire): AppSession {
    return {
      ...rest,
      send: (content, effort) => {
        this.running = true
        prompt(content, effort)
      },
      ...(steer && { steer }),
      answer: (id, result) => this.answerFor(id).resolve(result),
      interrupt: () => this.interrupt(stop),
      close: () => {
        this.drop()
        return close()
      },
    }
  }

  private answerFor(id: string) {
    const found = this.answers.get(id) ?? Promise.withResolvers<ToolResultBlock>()
    this.answers.set(id, found)
    return found
  }

  private ended() {
    this.running = false
    const waiting = this.stopped
    this.stopped = undefined
    waiting?.resolve()
    return !waiting
  }

  private interrupt(stop: () => void) {
    this.drop()
    if (!this.running) return Promise.resolve()
    this.stopped ??= Promise.withResolvers<void>()
    stop()
    return this.stopped.promise
  }

  private drop() {
    this.answers.forEach(found => {
      found.promise.catch(() => {})
      found.reject(new Error('sand stopped this turn'))
    })
    this.answers.clear()
  }
}

export { Turns }
