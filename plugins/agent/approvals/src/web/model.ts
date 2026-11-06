import { pcHello, type Pcs, type Wire } from '@sand/devices-contract'
import type { Owner } from '@sand/engine/contract'
import { derive, sig } from '@vaakx-dev/vrui'
import type { Context } from 'drydock'
import { type Answer, approvalAnswer, approvalsWire, type Decision, helloApprovals } from '../contract'

export interface Waiting {
  pc: string
  decision: Decision
}

export interface ModelParts {
  wire: Wire
  pcs: Pcs
}

export const createModel = (ctx: Context, { wire, pcs }: ModelParts) => {
  const byPc = sig<ReadonlyMap<string, Decision[]>>(new Map())
  const set = (pc: string, list: Decision[]) => byPc.update(current => new Map(current).set(pc, list))
  const hello = (pc: string) => set(pc, wire.hello(helloApprovals, pc) ?? [])

  ctx.on(pcHello, hello)
  for (const pc of pcs.list()) if (wire.ready(pc.id)) hello(pc.id)
  ctx.effect(() => wire.on(approvalsWire, (list, pc) => set(pc, list), { from: 'all' }))

  const all = derive(() =>
    [...byPc.get()].flatMap(([pc, list]) => list.map(decision => ({ pc, decision }))).sort((a, b) => a.decision.at - b.decision.at),
  )

  return {
    all,
    of: (owner: Owner, conversation: string) =>
      derive(() => all.get().filter(({ decision }) => decision.owner === owner && decision.conversation === conversation)),
    answer: ({ pc, decision }: Waiting, answer: Answer) => wire.call(approvalAnswer, { id: decision.id, answer }, pc),
  }
}

export type Model = ReturnType<typeof createModel>
