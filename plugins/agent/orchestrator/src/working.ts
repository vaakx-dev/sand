import { type Peers, peers } from '@sand/devices-contract'
import { backgroundJobs, jobEnd, jobStart, type Job } from '@sand/jobs/contract'
import { helloTurns, turnChange, turnChangeWire, type TurnInfo } from '@sand/turns-contract/contract'
import { joinDisposers } from '@sand/util'
import type { OrchestratorContext } from './context'
import { type Working, workingChange } from './contract'
import type { Starters } from './starters'

interface AwayTurn {
  pc: string
  started: number
}

export const createWorking = (ctx: OrchestratorContext, starters: Starters) => {
  const away = new Map<string, AwayTurn>()

  const tell = (starter: string | null | undefined) => {
    if (starter) ctx.emit(workingChange, starter)
  }

  const put = (thread: string, turn: AwayTurn | undefined) => {
    if (turn) away.set(thread, turn)
    else away.delete(thread)
    tell(starters.starterOf(thread)?.id)
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

  const runningJobs = (starter: string) =>
    (ctx.get(backgroundJobs)?.list(starter) ?? []).filter(job => job.status === 'running').map(job => job.started)

  const working = (starter: string): Working => ({
    subagents: [
      ...ctx.sessions.children(starter).flatMap(child => runningHere(child.id)),
      ...starters.elsewhere(starter).flatMap(({ thread }) => runningAway(thread)),
    ],
    background: runningJobs(starter),
  })

  const jobChanged = (job: Job) => tell(job.parent)

  ctx.on(turnChange, info => tell(ctx.sessions.open(info.session)?.parent))
  ctx.on(jobStart, jobChanged)
  ctx.on(jobEnd, jobChanged)
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
