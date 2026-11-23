import type { LLM, PastTurn } from '@sand/accounts/contract'
import type { NativeSessions } from '../contract'
import { outsideTurnOf, type Turn } from './turns'

interface OutsideSources {
  llm(): LLM | undefined
  native(): NativeSessions | undefined
  changed(): void
}

const FRESH_MS = 60_000

const fingerprint = (turns: PastTurn[]) => `${turns.length}:${turns.reduce((sum, turn) => sum + turn.at, 0)}`

class OutsideTurns {
  private past: PastTurn[] = []
  private since = Number.POSITIVE_INFINITY
  private readAt = 0
  private reading = false

  constructor(private readonly sources: OutsideSources) {}

  turns(since: number): Turn[] {
    this.refresh(since)
    const inSand = this.sources.native()?.natives() ?? new Set<string>()
    return this.past.filter(turn => !inSand.has(turn.native)).map(outsideTurnOf)
  }

  private covers(since: number) {
    return since >= this.since && Date.now() - this.readAt < FRESH_MS
  }

  private refresh(since: number) {
    if (this.reading || this.covers(since)) return
    this.reading = true
    void this.read(Math.min(since, this.since)).finally(() => {
      this.reading = false
    })
  }

  private async read(since: number) {
    const found = (await this.sources.llm()?.pastTurns?.(since)) ?? []
    const changed = fingerprint(found) !== fingerprint(this.past)
    this.past = found
    this.since = since
    this.readAt = Date.now()
    if (changed) this.sources.changed()
  }
}

export { OutsideTurns }
