import { botCreate, botList, bots, jobCreate, jobReport, jobUpdate, morningEntry } from '@sand/bots/contract'
import { startSand, type Sand } from '@sand/harness'
import { afterEach, expect, setSystemTime, test } from 'bun:test'

let sand: Sand

afterEach(async () => {
  await sand.stop()
  setSystemTime()
})

const at = (iso: string) => Date.parse(iso)

const until = async (done: () => Promise<boolean>) => {
  for (let tries = 0; tries < 500 && !(await done()); tries++) await Bun.sleep(10)
  expect(await done()).toBe(true)
}

test('each morning a bot with jobs sums them up in its chat, what needs the user first, and a bot without jobs posts nothing', async () => {
  setSystemTime(at('2026-11-17T07:59:00'))
  sand = await startSand([], { plugins: ['automation/schedules', 'bots/bots', 'bots/morning'] })
  const { ask } = sand
  const ferry = await ask(botCreate, { name: 'Ferry' })
  const juno = await ask(botCreate, { name: 'Juno' })
  const job = (title: string) => ask(jobCreate, { bot: ferry.id, title, goal: `${title} goal.`, done: `${title} done.` })
  const triage = await job('CI triage')
  const datasheets = await job('Datasheet watch')
  const notes = await job('Release notes')
  const quiet = await job('Dependency bumps')
  await ask(jobReport, { job: triage.id, outcome: 'done', summary: 'Fixed 2 failures, opened PR #412' })
  await ask(jobReport, { job: triage.id, outcome: 'nothing' })
  await ask(jobReport, { job: datasheets.id, outcome: 'needs', summary: 'TPS62840 rev. C', question: 'Keep the part or switch?' })
  await ask(jobUpdate, { job: notes.id, patch: { paused: true } })

  setSystemTime(at('2026-11-17T08:00:00'))
  await until(async () => (await ask(botList, {})).some(bot => bot.morning))

  const [ferryNow, junoNow] = [ferry, juno].map(bot => sand.app.get(bots)!.get(bot.id)!)
  expect(ferryNow!.morning).toMatchObject({
    lines: [
      { job: datasheets.id, status: 'needs', text: 'Keep the part or switch?' },
      { job: triage.id, status: 'on', text: 'Fixed 2 failures, opened PR #412' },
      { job: quiet.id, status: 'on', text: 'No runs since yesterday' },
      { job: notes.id, status: 'paused', text: '' },
    ],
  })
  expect(sand.app.get(bots)!.conversation(ferry.id).entries().filter(entry => entry.type === morningEntry)).toHaveLength(1)
  expect(junoNow!.morning).toBeUndefined()
})
