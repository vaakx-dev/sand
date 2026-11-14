import { engine, turnClose, turnOpen } from '@sand/engine/contract'
import { definePlugin } from 'drydock'
import { sleepBlock } from './block'

const SLEEP_AGAIN_AFTER_MS = 60_000

export default definePlugin({
  name: 'keep-awake',
  description: "Blocks system sleep while any chat's turn is running and lets it go a minute after the last one ends; the screen may still turn off and lock",
  inject: { engine },
  apply(ctx) {
    const block = sleepBlock(problem => console.warn(`keep-awake: this PC may sleep while chats work: ${problem}`))
    const working = new Set<string>()
    let sleepTimer: Timer | undefined

    const stopTimer = () => {
      clearTimeout(sleepTimer)
      sleepTimer = undefined
    }

    const started = (turn: string) => {
      working.add(turn)
      stopTimer()
      block.hold()
    }

    const sleepSoon = () => {
      stopTimer()
      sleepTimer = setTimeout(block.release, SLEEP_AGAIN_AFTER_MS)
    }

    const ended = (turn: string) => {
      working.delete(turn)
      if (!working.size) sleepSoon()
    }

    ctx.on(turnOpen, (_conversation, turn) => started(turn.id))
    ctx.on(turnClose, (_conversation, _result, turn) => ended(turn.id))
    ctx.effect(() => () => {
      stopTimer()
      block.release()
    })
  },
})
