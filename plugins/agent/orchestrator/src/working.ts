import { type Peers, peers } from '@sand/devices-contract'
import { helloTurns, turnChange, turnChangeWire, type TurnInfo } from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { OrchestratorContext } from './context'
import { subagentsChange } from './contract'
import type { Starters } from './starters'

interface AwayTurn {
  pc: string
  started: number
}

export const createWorking = (ctx: OrchestratorContext, starters: Starters) => {
  const away = new Map<string, AwayTurn>()

  const lineOf = (id: string): string[] => {
    const parent = ctx.sessions.open(id)?.parent
    return parent ? [parent, ...lineOf(parent)] : []
  }

  const awayLineOf = (thread: string) => {
    const starter = starters.starterOf(thread)?.id
    return starter ? [starter, ...lineOf(starter)] : []
  }

  const tell = (line: string[]) => {
    for (const starter of line) ctx.emit(subagentsChange, starter)
  }

  const put = (thread: string, turn: AwayTurn | undefined) => {
    if (turn) away.set(thread, turn)
    else away.delete(thread)
    tell(awayLineOf(thread))
  }

  const heard = (pc: string, info: TurnInfo) => put(info.session, info.status === 'running' ? { pc, started: info.started } : undefined)

  const greeted = (found: Peers, pc: string) => {
    const turns = found.hello(helloTurns, pc) ?? {}
    for (const [thread, turn] of away) if (turn.pc === pc && !turns[thread]) put(thread, undefined)
    for (const info of Object.values(turns)) heard(pc, info)
  }

  const unpaired = (found: Peers) => {
    const paired = new Set(found.list().map(pc => pc.id))
    for (const [thread, turn] of away) if (!paired.has(turn.pc)) put(thread, undefined)
  }

  const runningHere = (thread: string) => {
    const turn = ctx.turns.current(ctx.sessions.require(thread))
    return turn?.status === 'running' ? [turn.started] : []
  }

  const runningAway = (thread: string) => {
    const turn = away.get(thread)
    return turn ? [turn.started] : []
  }

  const working = (starter: string): number[] => [
    ...ctx.sessions.children(starter).flatMap(child => [...runningHere(child.id), ...working(child.id)]),
    ...starters.elsewhere(starter).flatMap(({ thread }) => runningAway(thread)),
  ]

  ctx.on(turnChange, info => tell(lineOf(info.session)))
  ctx.watch(peers, found => {
    if (!found) return
    for (const pc of found.connected()) greeted(found, pc)
    return joinDisposers(
      found.onOpen(pc => greeted(found, pc)),
      found.onChange(() => unpaired(found)),
      found.on(turnChangeWire, ([, info], pc) => heard(pc, info)),
    )
  })

  return working
}
