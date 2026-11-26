import type { Session } from '@sand/chats/contract'
import { startSand, type Sand } from '@sand/harness'
import { until } from '@sand/harness/until'
import { backgroundJobs } from '@sand/jobs/contract'
import { orchestrator } from '@sand/orchestrator/contract'
import type { Reply } from '@sand/replay/contract'
import { afterEach, expect, test } from 'bun:test'
import { join } from 'node:path'

let sand: Sand

afterEach(() => sand.stop())

const HOLD: Reply = [{ type: 'hold' }]

const delegate = (input: Record<string, unknown> = {}): Reply => [{ type: 'call', name: 'agent', input: { label: 'Dig', task: 'Dig into it', does: 'build', background: true, ...input } }]

const running = (session: Session) => sand.turns.current(session)?.status === 'running'

const holdForever = (parent: Session) =>
  sand.app.get(backgroundJobs)!.start({
    parent,
    label: 'Watch the logs',
    command: 'tail -f build.log',
    cwd: parent.cwd,
    work: signal => new Promise(resolve => signal.addEventListener('abort', () => resolve('stopped'))),
    outlives: () => false,
    read: () => '',
    output: () => '',
  })

test("a starter's work counts only its own running subagents and background commands, not theirs", async () => {
  sand = await startSand(
    [
      { id: 'parent', models: ['m'], replies: [delegate(), [{ type: 'text', text: 'Started it.' }]], api: 'anthropic' },
      { id: 'child', models: ['m'], replies: [delegate({ agent: 'grand' }), HOLD], api: 'anthropic' },
      { id: 'grand', models: ['m'], replies: [HOLD], api: 'anthropic' },
    ],
    { plugins: ['core/watch', 'agent/subagents', 'agent/jobs'], options: { model: { subagent: { model: 'child/m' } } } },
  )
  await Bun.write(join(sand.home, 'agents', 'grand.md'), '---\ndescription: Goes deeper.\nmodel: grand/m\n---\nGo deeper.')
  const parent = sand.chat('parent/m')
  await sand.turns.run(parent, 'Go')
  const child = await until(() => sand.sessions.children(parent.id)[0])
  const grandchild = await until(() => sand.sessions.children(child.id)[0])
  await until(() => running(sand.sessions.require(child.id)) && running(sand.sessions.require(grandchild.id)))
  const job = holdForever(parent)
  holdForever(sand.sessions.require(child.id))

  const working = sand.app.get(orchestrator)!.working(parent.id)
  expect(working.subagents).toEqual([sand.turns.current(sand.sessions.require(child.id))!.started])
  expect(working.background).toEqual([job.started])
})
